const { verifySignature } = require('../lib/verify');
const crypto = require('crypto');

describe('verifySignature', () => {
  const secret = 'test-secret';
  const payload = JSON.stringify({ action: 'opened' });
  const body = Buffer.from(payload);

  it('should return true for a valid signature', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const signature = 'sha256=' + hmac.digest('hex');

    expect(verifySignature(secret, signature, body)).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    expect(verifySignature(secret, 'sha256=invalid', body)).toBe(false);
  });

  it('should return false if header is missing', () => {
    expect(verifySignature(secret, undefined, body)).toBe(false);
  });
});
