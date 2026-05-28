const request = require('supertest');
const crypto = require('crypto');

// Mock external modules before requiring app
jest.mock('../lib/github');
jest.mock('../lib/generate');

const app = require('../server');
const { getOctokit, getPRFiles, updatePRBody, addLabel } = require('../lib/github');
const { generateDescription, shouldGenerate } = require('../lib/generate');

describe('POST /webhook', () => {
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = secret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function getSignature(body) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    return 'sha256=' + hmac.digest('hex');
  }

  it('should skip non-pull_request events', async () => {
    const payload = JSON.stringify({ action: 'created' });
    const body = Buffer.from(payload);
    const signature = getSignature(body);

    const response = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', signature)
      .set('x-github-event', 'issue_comment')
      .set('Content-Type', 'application/json')
      .send(payload); // Supertest will handle Buffer conversion if we pass payload

    expect(response.status).toBe(200);
    expect(response.body.skipped).toBe(true);
  });

  it('should process valid pull_request event', async () => {
    const payload = {
      action: 'opened',
      pull_request: {
        number: 1,
        title: 'Test PR',
        body: '',
        draft: false,
        head: { ref: 'feat' },
        base: { ref: 'main' }
      },
      repository: {
        owner: { login: 'user' },
        name: 'repo'
      },
      installation: { id: 123 }
    };
    const body = Buffer.from(JSON.stringify(payload));
    const signature = getSignature(body);

    shouldGenerate.mockReturnValue(true);
    getOctokit.mockReturnValue({});
    getPRFiles.mockResolvedValue([{ filename: 'test.js', status: 'modified', additions: 1, deletions: 1, patch: 'diff' }]);
    generateDescription.mockResolvedValue('AI Description');
    updatePRBody.mockResolvedValue();
    addLabel.mockResolvedValue();

    const response = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', signature)
      .set('x-github-event', 'pull_request')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(generateDescription).toHaveBeenCalled();
    expect(updatePRBody).toHaveBeenCalledWith(expect.anything(), 'user', 'repo', 1, 'AI Description');
  });

  it('should return 401 for invalid signature', async () => {
    const response = await request(app)
      .post('/webhook')
      .set('x-hub-signature-256', 'sha256=invalid')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ action: 'opened' }));

    expect(response.status).toBe(401);
  });
});
