/**
 * Verifies the GitHub webhook signature to ensure requests are genuine.
 * GitHub signs every webhook payload with HMAC-SHA256 using your webhook secret.
 */

const crypto = require('crypto');

/**
 * @param {string} secret  - Your GitHub App webhook secret
 * @param {string} header  - The X-Hub-Signature-256 header value
 * @param {Buffer} body    - The raw request body
 * @returns {boolean}
 */
function verifySignature(secret, header, body) {
  if (!header) return false;

  const sig = Buffer.from(header, 'utf8');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const digest = Buffer.from('sha256=' + hmac.digest('hex'), 'utf8');

  if (sig.length !== digest.length) return false;
  return crypto.timingSafeEqual(digest, sig);
}

module.exports = { verifySignature };
