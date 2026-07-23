import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const SECRET = 'test-secret-must-be-at-least-32-chars-long';

jest.mock('../env', () => ({
  env: {
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    APP_BASE_URL: 'http://localhost:4200',
    GMAIL_USER: 'test@example.com',
    GMAIL_APP_PASSWORD: 'app-pw',
    FROM_NAME: 'Test',
  },
}));

const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: { select: () => ({ from: () => ({ where: () => selectMock() }) }) },
}));

const sendConsentMock = jest.fn();
jest.mock('../services/email', () => ({
  sendConsentRequest: (...a: unknown[]) => sendConsentMock(...a),
  sendMagicLink: jest.fn(),
}));

import { requestLinkRouter } from '../routes/request-link';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLinkRouter);
  return app;
}

const magicToken = (camperId: number, opts: jwt.SignOptions = {}) =>
  jwt.sign({ camperId, kind: 'magic' }, SECRET, { expiresIn: '30m', ...opts });

describe('POST /request-consent-resend', () => {
  beforeEach(() => {
    selectMock.mockReset();
    sendConsentMock.mockReset().mockResolvedValue(undefined);
  });

  it('re-issues a fresh consent link for a valid token', async () => {
    selectMock.mockResolvedValueOnce([{ id: 7, firstName: 'Ryan', parentEmail: 'p@x.com', deletedAt: null }]);

    const res = await request(buildApp()).post('/request-consent-resend').send({ token: magicToken(7) });
    await new Promise((r) => setImmediate(r));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sendConsentMock).toHaveBeenCalledTimes(1);
    const [to, firstName, url] = sendConsentMock.mock.calls[0]!;
    expect(to).toBe('p@x.com');
    expect(firstName).toBe('Ryan');
    expect(url).toMatch(/^http:\/\/localhost:4200\/verify-link\?token=/);
  });

  it('works even when the original token has EXPIRED (the whole point)', async () => {
    selectMock.mockResolvedValueOnce([{ id: 7, firstName: 'Ryan', parentEmail: 'p@x.com', deletedAt: null }]);

    const expired = magicToken(7, { expiresIn: '-10s' });
    const res = await request(buildApp()).post('/request-consent-resend').send({ token: expired });
    await new Promise((r) => setImmediate(r));

    expect(res.status).toBe(200);
    expect(sendConsentMock).toHaveBeenCalledTimes(1);
  });

  it('returns ok without sending or touching the DB for a forged token (no enumeration)', async () => {
    const forged = jwt.sign({ camperId: 7, kind: 'magic' }, 'a-different-secret-entirely');
    const res = await request(buildApp()).post('/request-consent-resend').send({ token: forged });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(selectMock).not.toHaveBeenCalled();
    expect(sendConsentMock).not.toHaveBeenCalled();
  });

  it('returns ok without sending when the camper is gone or has no parent email', async () => {
    selectMock.mockResolvedValueOnce([]); // not found
    expect(
      (await request(buildApp()).post('/request-consent-resend').send({ token: magicToken(7) })).status
    ).toBe(200);

    selectMock.mockResolvedValueOnce([{ id: 7, firstName: 'X', parentEmail: null, deletedAt: null }]);
    await request(buildApp()).post('/request-consent-resend').send({ token: magicToken(7) });

    expect(sendConsentMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed body with 400', async () => {
    expect((await request(buildApp()).post('/request-consent-resend').send({})).status).toBe(400);
    expect(
      (await request(buildApp()).post('/request-consent-resend').send({ token: 'x' })).status
    ).toBe(400);
  });
});
