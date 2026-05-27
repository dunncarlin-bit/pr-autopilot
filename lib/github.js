/**
 * GitHub API client helpers.
 * Uses a GitHub App Installation token for authentication.
 */

const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

/**
 * Build an authenticated Octokit instance for a specific installation.
 */
function getOctokit(installationId) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = (process.env.GITHUB_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });
}

/**
 * Fetch the unified diff for a pull request.
 * Returns the raw diff string (patch format).
 */
async function getPRDiff(octokit, owner, repo, pullNumber) {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  });
  return response.data;
}

/**
 * Fetch file-level metadata for a PR (filenames + stats, no diff content).
 * Useful as a lightweight fallback if the diff is too large.
 */
async function getPRFiles(octokit, owner, repo, pullNumber) {
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return data.map(f => ({
    filename: f.filename,
    status: f.status,         // added | removed | modified | renamed
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,           // may be undefined for binary files
  }));
}

/**
 * Fetch existing PR details (title, body, base branch, head branch).
 */
async function getPRDetails(octokit, owner, repo, pullNumber) {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return {
    title: data.title,
    body: data.body,
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
    isDraft: data.draft,
    author: data.user.login,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
  };
}

/**
 * Update the PR body with the generated description.
 */
async function updatePRBody(octokit, owner, repo, pullNumber, newBody) {
  await octokit.rest.pulls.update({
    owner,
    repo,
    pull_number: pullNumber,
    body: newBody,
  });
}

/**
 * Post a comment on the PR (used as fallback if we can't edit the body).
 */
async function postComment(octokit, owner, repo, issueNumber, body) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

/**
 * Add a label to a PR/issue.
 */
async function addLabel(octokit, owner, repo, issueNumber, label) {
  try {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: [label],
    });
  } catch (err) {
    console.warn(`Could not add label ${label}: ${err.message}`);
  }
}

module.exports = {
  getOctokit,
  getPRDiff,
  getPRFiles,
  getPRDetails,
  updatePRBody,
  postComment,
  addLabel,
};
