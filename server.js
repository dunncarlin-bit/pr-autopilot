/**
 * PR Autopilot — GitHub App webhook server
 *
 * Listens for `pull_request` events (opened, reopened, ready_for_review).
 * When a PR has an empty/minimal description, calls Claude to generate one
 * and either updates the PR body or posts a comment.
 *
 * Environment variables (see .env.example):
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
  getPRDetails,
  updatePRBody,
  postComment,
  addLabel,
} = require('./lib/github');
const { generateDescription, shouldGenerate } = require('./lib/generate');

const app = express();

// ── Static landing page ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Raw body capture for signature verification ────────────────────────────────
app.use('/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── GitHub App installation token generation ───────────────────────────────────
/**
 * Exchange GitHub App credentials for an installation access token.
 * GitHub App auth flow: App private key → JWT → installation token.
 */
async function getInstallationToken(installationId) {
  // We use fetch + manual JWT because we want zero extra dependencies.
  // The JWT is valid for 10 minutes; installation tokens last 1 hour.
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');

  // Build JWT header + payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,   // issued 60s ago to account for clock drift
    exp: now + 540,  // expires in 9 minutes
    iss: appId,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsigned = `${header}.${body}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${unsigned}.${signature}`;

  const resp = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to get installation token: ${resp.status} — ${err}`);
  }

  const data = await resp.json();
  return data.token;
}

// ── Webhook endpoint ────────────────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  // 1. Verify signature
  const sig = req.headers['x-hub-signature-256'];
  if (!verifySignature(process.env.GITHUB_WEBHOOK_SECRET, sig, req.body)) {
    console.warn('❌ Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = req.headers['x-github-event'];

  // 3. Only handle pull_request events we care about
  const relevantActions = ['opened', 'reopened', 'ready_for_review'];
  if (event !== 'pull_request' || !relevantActions.includes(payload.action)) {
    return res.status(200).json({ skipped: true, reason: `event=${event} action=${payload.action}` });
  }

  // 4. Skip draft PRs (they're not ready for review yet)
  if (payload.pull_request.draft) {
    return res.status(200).json({ skipped: true, reason: 'draft PR' });
  }

  const { number: pullNumber, title, body: existingBody, base, head } = payload.pull_request;
  const { owner, name: repo } = payload.repository;
  const installationId = payload.installation?.id;

  console.log(`\n📦 PR #${pullNumber} "${title}" (${owner.login}/${repo}) — action: ${payload.action}`);

  // 5. Check if we should generate a description
  if (!shouldGenerate(existingBody)) {
    console.log('✅ PR already has a substantial description — skipping');
    return res.status(200).json({ skipped: true, reason: 'description already present' });
  }

  // 6. Do the work synchronously before responding.
  //    Vercel serverless kills the function immediately after res.end() —
  //    setImmediate / fire-and-forget patterns never execute. We process
  //    everything inline. Claude Haiku is fast enough (~3-5 s) to stay
  //    comfortably within GitHub's 10-second webhook delivery timeout.
  try {
    const token = await getInstallationToken(installationId);
    const octokit = getOctokit(token);

    // Fetch file metadata (fast)
    const files = await getPRFiles(octokit, owner.login, repo, pullNumber);
    console.log(`   📂 ${files.length} files changed`);

    // Build a lightweight diff summary from file patches (avoids fetching full diff)
    const patchSummary = files
      .filter(f => f.patch)
      .map(f => `--- ${f.filename}\n${f.patch}`)
      .join('\n\n')
      .slice(0, 20_000);

    // Generate the description
    console.log('   🤖 Generating description...');
    const description = await generateDescription({
      title,
      headBranch: head.ref,
      baseBranch: base.ref,
      diff: patchSummary,
      files,
    });

    // Try to update the PR body first
    try {
      await updatePRBody(octokit, owner.login, repo, pullNumber, description);
      console.log('   ✅ PR body updated');
    } catch (updateErr) {
      // Fall back to posting a comment
      console.warn('   ⚠️  Could not update PR body, posting comment instead:', updateErr.message);
      const commentBody = `### 📝 PR Autopilot — Suggested Description\n\nThe PR was opened without a description. Here's a generated one — paste it in if useful:\n\n---\n\n${description}`;
      await postComment(octokit, owner.login, repo, pullNumber, commentBody);
      console.log('   ✅ Comment posted');
    }

    // Label it so teams know it was auto-generated
    await addLabel(octokit, owner.login, repo, pullNumber, 'pr-autopilot');

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('   💥 Error processing PR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\