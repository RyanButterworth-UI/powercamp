import { envSchema } from '../env';

// Realistic-shape PEM body. Real bytes don't matter — we only assert the
// shape after normalisation (PEM headers + footers present, line breaks
// where they belong).
const PEM_BODY =
  'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDgGq8AOFakeKey1\n' +
  'Vh3yQ5xVc2k6KX9pZ8R3jr0RsZpQwMq8MyZl3o6FsJjLfHwSdLKp4eDjeJrW+nh3\n' +
  '-----';

const REAL_NEWLINE_PEM =
  `-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----\n`;

const ESCAPED_PEM = REAL_NEWLINE_PEM.replace(/\n/g, '\\n');

const baseEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://user:pass@host:5432/db',
  GOOGLE_SHEET_ID: 'sheet-id',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'svc@example.iam.gserviceaccount.com',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
  ADMIN_PASSWORD_HASH: '$2b$10$fakehash',
  LEADER_PASSWORD_HASH: '$2b$10$fakehash',
  NEIL_PASSWORD_HASH: '$2b$10$fakehash',
  EDITOR_PASSWORD_HASH: '$2b$10$fakehash',
  GMAIL_USER: 'send@example.com',
  GMAIL_APP_PASSWORD: 'fake-pw',
};

function expectKey(input: string) {
  const result = envSchema.safeParse({ ...baseEnv, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: input });
  return result;
}

describe('envSchema — GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY normalisation', () => {
  it('accepts a real-newline PEM (multi-line paste)', () => {
    const result = expectKey(REAL_NEWLINE_PEM);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toContain('-----BEGIN PRIVATE KEY-----');
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toContain('\n');
    }
  });

  it('converts \\n escapes to real newlines (the format the JSON file gives you)', () => {
    const result = expectKey(ESCAPED_PEM);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toBe(REAL_NEWLINE_PEM);
    }
  });

  it('strips surrounding double quotes (common when pasted from JSON value)', () => {
    const result = expectKey(`"${ESCAPED_PEM}"`);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.startsWith('-----BEGIN')).toBe(true);
    }
  });

  it('strips surrounding single quotes', () => {
    const result = expectKey(`'${ESCAPED_PEM}'`);
    expect(result.success).toBe(true);
  });

  it('extracts private_key when the WHOLE service-account JSON is pasted', () => {
    const jsonValue = JSON.stringify({
      type: 'service_account',
      project_id: 'test',
      private_key_id: 'abc',
      private_key: REAL_NEWLINE_PEM,
      client_email: 'svc@example.iam.gserviceaccount.com',
    });
    const result = expectKey(jsonValue);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toBe(REAL_NEWLINE_PEM);
    }
  });

  it('collapses double-escaped \\\\n into real newlines', () => {
    const doubleEscaped = REAL_NEWLINE_PEM.replace(/\n/g, '\\\\n');
    const result = expectKey(doubleEscaped);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toContain('\n');
      expect(result.data.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).not.toContain('\\n');
    }
  });

  it('rejects a value with no PEM markers at all (e.g. placeholder text)', () => {
    const result = expectKey('type your private key here');
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(' ');
      expect(messages).toMatch(/PEM/i);
      expect(messages).toMatch(/BEGIN PRIVATE KEY/);
    }
  });

  it('rejects a truncated PEM (header but no footer)', () => {
    const result = expectKey(`-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n`);
    expect(result.success).toBe(false);
  });

  it('accepts RSA PRIVATE KEY format (PKCS#1) — older Google JSON exports', () => {
    const rsaKey = REAL_NEWLINE_PEM
      .replace('BEGIN PRIVATE KEY', 'BEGIN RSA PRIVATE KEY')
      .replace('END PRIVATE KEY', 'END RSA PRIVATE KEY');
    const result = expectKey(rsaKey);
    expect(result.success).toBe(true);
  });
});
