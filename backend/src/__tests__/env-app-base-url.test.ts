import { envSchema } from '../env';

// A minimal env that satisfies every other required field. Each test
// overrides what it needs to assert on (APP_BASE_URL + NODE_ENV).
const baseEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://user:pass@host:5432/db',
  GOOGLE_SHEET_ID: 'sheet-id',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'svc@example.iam.gserviceaccount.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
  ADMIN_PASSWORD_HASH: '$2b$10$fakehash',
  LEADER_PASSWORD_HASH: '$2b$10$fakehash',
  NEIL_PASSWORD_HASH: '$2b$10$fakehash',
  EDITOR_PASSWORD_HASH: '$2b$10$fakehash',
  DELETE_PASSWORD_HASH: '$2b$10$fakehash',
  GMAIL_USER: 'send@example.com',
  GMAIL_APP_PASSWORD: 'fake-pw',
};

describe('envSchema — APP_BASE_URL guard', () => {
  // Snapshot the real NODE_ENV so the suite doesn't leak it into other tests.
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('defaults to http://localhost:4200 outside production', () => {
    process.env.NODE_ENV = 'development';
    const parsed = envSchema.parse(baseEnv);
    expect(parsed.APP_BASE_URL).toBe('http://localhost:4200');
  });

  it('rejects localhost in production', () => {
    process.env.NODE_ENV = 'production';
    const result = envSchema.safeParse({
      ...baseEnv,
      APP_BASE_URL: 'http://localhost:4200',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(' ');
      expect(messages).toMatch(/APP_BASE_URL.*public URL/i);
    }
  });

  it('rejects 127.0.0.1 in production', () => {
    process.env.NODE_ENV = 'production';
    const result = envSchema.safeParse({
      ...baseEnv,
      APP_BASE_URL: 'http://127.0.0.1:4200',
    });
    expect(result.success).toBe(false);
  });

  it('rejects falling-through default in production (no APP_BASE_URL set)', () => {
    process.env.NODE_ENV = 'production';
    // Default kicks in (http://localhost:4200) — and the refinement must
    // reject it. Otherwise a missing Render env var silently emails
    // invite links pointing at localhost.
    const result = envSchema.safeParse(baseEnv);
    expect(result.success).toBe(false);
  });

  it('accepts a real public URL in production', () => {
    process.env.NODE_ENV = 'production';
    const parsed = envSchema.parse({
      ...baseEnv,
      APP_BASE_URL: 'https://powercamplife.co.za',
    });
    expect(parsed.APP_BASE_URL).toBe('https://powercamplife.co.za');
  });
});
