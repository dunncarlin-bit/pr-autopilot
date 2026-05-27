/**
 * PR Autopilot -- GitHub App webhook server
 *
 * Listens for `pull_request` events (opened, reopened, ready_for_review).
 * When a PR has an empty/minimal description, calls Claude to generate one
 * and either updates the PR body or posts a comment.
 *
 * Environment variables:
 *   GITHUB_APP_ID          - Your GitHub App ID
 *   GITHUB_PRIVATE_KEY     - PEM-encoded private key (newlines as \n)
 *   GITHUB_WEBHOOK_SECRET  - Webhook secret set in App settings
 *   ANTHROPIC_API_KEY      - Claude API key
 *   PORT                   - HTTP port (default 3000)
 */

require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const path = require('path');

const { verifySignature } = require('./lib/verify');
const {
  getOctokit,
  getPRFiles,
  updatePRBody,
  postComment,
  addLabel,
} = require('./lib/github');
const { generateDescription, shouldGenerate } = require('./lib/generate');

const app = express();

// Static landing page
app.use(express.static(path.join(__dirname, 'public')));

// Raw body capture for signature verification
app.use('/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

// Health check
app.get('/health', function(_req, res) {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// GitHub App installation token generation
async function getInstallationToken(installationId) {
  var appId = process.env.GITHUB_APP_ID;
  var rawKey = process.env.GITHUB_PRIVATE_KEY || '';
  var privateKey = rawKey.replace(/\\n/g, '\n');

  var now = Math.floor(Date.now() / 1000);
  var jwtPayload = {
    iat: now - 60,
    exp: now + 540,
    iss: appId,
  };

  var header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  var body = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  var unsigned = header + '.' + body;

  var sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  var signature = sign.sign(privateKey, 'base64url');
  var jwt = unsigned + '.' + signature;

  var resp = await fetch(
    'https://api.github.com/app/installations/' + installationId + '/access_tokens',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + jwt,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error('Failed to get installation token: ' + resp.status + ' -- ' + errText);
  }

  var data = await resp.json();
  return data.token;
}

// Webhook endpoint
app.post('/webhook', async function(req, res) {
  // 1. Verify signature
  var sig = req.headers['x-hub-signature-256'];
  if (!verifySignature(process.env.GITHUB_WEBHOOK_SECRET, sig, req.body)) {
    console.warn('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse payload
  var payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  var event = req.headers['x-github-event'];

  // 3. Only handle pull_request events we care about
  var relevantActions = ['opened', 'reopened', 'ready_for_review'];
  if (event !== 'pull_request' || relevantActions.indexOf(payload.action) === -1) {
    return res.status(200).json({ skipped: true, reason: 'event=' + event + ' action=' + payload.action });
  }

  // 4. Skip draft PRs
  if (payload.pull_request.draft) {
    return res.status(200).json({ skipped: true, reason: 'draft PR' });
  }

  var pullNumber = payload.pull_request.number;
  var title = payload.pull_request.title;
  var existingBody = payload.pull_request.body;
  var head = payload.pull_request.head;
  var base = payload.pull_request.base;
  var owner = payload.repository.owner;
  var repo = payload.repository.name;
  var installationId = payload.installation && payload.installation.id;

  console.log('PR #' + pullNumber + ' "' + title + '" (' + owner.login + '/' + repo + ') action: ' + payload.action);

  // 5. Check if we should generate a description
  if (!shouldGenerate(existingBody)) {
    console.log('PR already has a substantial description -- skipping');
    return res.status(200).json({ skipped: true, reason: 'description already present' });
  }

  // 6. Process synchronously before responding.
  //    Vercel serverless kills the function after res.end() so all work
  //    must complete before we call res.json().
  try {
    var token = await getInstallationToken(installationId);
    var octokit = getOctokit(token);

    var files = await getPRFiles(octokit, owner.login, repo, pullNumber);
    console.log(files.length + ' files changed');

    var patchSummary = files
      .filter(function(f) { return f.patch; })
      .map(function(f) { return '--- ' + f.filename + '\n' + f.patch; })
      .join('\n\n')
      .slice(0, 20000);

    console.log('Generating description...');
    var description = await generateDescription({
      title: title,
      headBranch: head.ref,
      baseBranch: base.ref,
      diff: patchSummary,
      files: files,
    });

    try {
      await updatePRBody(octokit, owner.login, repo, pullNumber, description);
      console.log('PR body updated successfully');
    } catch (updateErr) {
      console.warn('Could not update PR body, posting comment instead:', updateErr.message);
      var commentBody = '### PR Autopilot -- Suggested Description\n\n' + description;
      await postComment(octokit, owner.login, repo, pullNumber, commentBody);
      console.log('Comment posted');
    }

    await addLabel(octokit, owner.login, repo, pullNumber, 'pr-autopilot');
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Error processing PR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start server
var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('PR Autopilot running on port ' + PORT);
  console.log('Webhook endpoint: POST /webhook');
  console.log('Health check:     GET  /health');
});
