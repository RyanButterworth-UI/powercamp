import express from 'express';
import request from 'supertest';

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
  db: {
    select: () => ({ from: () => ({ where: () => selectMock() }) }),
  },
}));

const sendMock = jest.fn();
jest.mock('../services/email', () => ({
  sendMagicLink: (...args: unknown[]) => sendMock(...args),
}));

import { requestLinkRouter } from '../routes/request-link';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLinkRouter);
  return app;
}

describe('POST /request-link', () => {
  beforeEach(() => {
    selectMock.mockReset();
    sendMock.mockReset().mockResolvedValue(undefined);
  });

  it('sends a magic link email containing a token URL when the camper exists', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'Ryan', parentEmail: 'ryan@example.com', deletedAt: null },
    ]);

    const res = await request(buildApp()).post('/request-link').send({ camperId: 7 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [to, firstName, url] = sendMock.mock.calls[0]!;
    expect(to).toBe('ryan@example.com');
    expect(firstName).toBe('Ryan');
    expect(url).toMatch(/^http:\/\/localhost:4200\/verify-link\?token=/);
  });

  it('returns ok without sending email when camperId does not exist (no enumeration)', async () => {
    selectMock.mockResolvedValueOnce([]);

    const res = await request(buildApp()).post('/request-link').send({ camperId: 99999 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns ok without sending email when camper has no parent_email', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'X', parentEmail: null, deletedAt: null },
    ]);

    const res = await request(buildApp()).post('/request-link').send({ camperId: 7 });

    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns ok without sending email when camper is soft-deleted', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'X', parentEmail: 'x@x.com', deletedAt: new Date() },
    ]);

    const res = await request(buildApp()).post('/request-link').send({ camperId: 7 });

    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies with 400', async () => {
    expect((await request(buildApp()).post('/request-link').send({})).status).toBe(400);
    expect(
      (await request(buildApp()).post('/request-link').send({ camperId: 'abc' })).status
    ).toBe(400);
    expect(
      (await request(buildApp()).post('/request-link').send({ camperId: -1 })).status
    ).toBe(400);
  });

  it('returns 500 when the DB query throws', async () => {
    selectMock.mockRejectedValueOnce(new Error('db down'));
    const res = await request(buildApp()).post('/request-link').send({ camperId: 7 });
    expect(res.status).toBe(500);
  });

  it('still returns 200 even when email sending fails (best-effort)', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 7, firstName: 'X', parentEmail: 'x@x.com', deletedAt: null },
    ]);
    sendMock.mockRejectedValueOnce(new Error('SMTP down'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(buildApp()).post('/request-link').send({ camperId: 7 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    errSpy.mockRestore();
  });
});
