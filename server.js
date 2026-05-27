/**
 * PR Autopilot -- GitHub App webhook server
 *
 * Listens for `pull_request` events (opened, reopened, ready_for_review).
 * When a PR has an empty/minimal description, calls Claude to generate one
 * and either updates the PR body or posts a comment.
 */

require('dotenv').config();

const express = require('express');
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

// Clean URLs for legal pages
app.get('/privacy', function(_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/terms', function(_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Webhook endpoint
app.post('/webhook', async function(req, res) {
  // 1. Verify signature
  const sig = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!verifySignature(secret, sig, req.body)) {
    console.warn('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = req.headers['x-github-event'];

  // 3. Only handle pull_request events we care about
  const relevantActions = ['opened', 'reopened', 'ready_for_review'];
  if (event !== 'pull_request' || relevantActions.indexOf(payload.action) === -1) {
    return res.status(200).json({ skipped: true, reason: 'event=' + event + ' action=' + payload.action });
  }

  // 4. Skip draft PRs
  if (payload.pull_request.draft) {
    return res.status(200).json({ skipped: true, reason: 'draft PR' });
  }

  const pullNumber = payload.pull_request.number;
  const title = payload.pull_request.title;
  const existingBody = payload.pull_request.body;
  const head = payload.pull_request.head;
  const base = payload.pull_request.base;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const installationId = payload.installation && payload.installation.id;

  if (!installationId) {
    return res.status(400).json({ error: 'Missing installation ID' });
  }

  console.log(`PR #${pullNumber} "${title}" (${owner}/${repo}) action: ${payload.action}`);

  // 5. Check if we should generate a description
  if (!shouldGenerate(existingBody)) {
    console.log('PR already has a substantial description -- skipping');
    return res.status(200).json({ skipped: true, reason: 'description already present' });
  }

  // 6. Process synchronously before responding (for Vercel compatibility)
  try {
    const octokit = getOctokit(installationId);

    const files = await getPRFiles(octokit, owner, repo, pullNumber);
    console.log(files.length + ' files changed');

    const patchSummary = files
      .filter(function(f) { return f.patch; })
      .map(function(f) { return '--- ' + f.filename + '\n' + f.patch; })
      .join('\n\n')
      .slice(0, 20000);

    console.log('Generating description...');
    const description = await generateDescription({
      title: title,
      headBranch: head.ref,
      baseBranch: base.ref,
      diff: patchSummary,
      files: files,
    });

    try {
      await updatePRBody(octokit, owner, repo, pullNumber, description);
      console.log('PR body updated successfully');
    } catch (updateErr) {
      console.warn('Could not update PR body, posting comment instead:', updateErr.message);
      const commentBody = '### PR Autopilot -- Suggested Description\n\n' + description;
      await postComment(octokit, owner, repo, pullNumber, commentBody);
      console.log('Comment posted');
    }

    await addLabel(octokit, owner, repo, pullNumber, 'pr-autopilot');
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Error processing PR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start server only if not being required (e.g. in tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, function() {
    console.log('PR Autopilot running on port ' + PORT);
  });
}

// Export for testing
module.exports = app;
