import express from 'express';
import request from 'supertest';

jest.mock('../services/sheets', () => ({
  postToAppsScript: jest.fn(),
}));

import { postToAppsScript } from '../services/sheets';
import { consentRouter } from '../routes/consent';

const mockPost = postToAppsScript as jest.MockedFunction<typeof postToAppsScript>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(consentRouter);
  return app;
}

describe('POST /consent', () => {
  it('tags the payload as consent and forwards to Apps Script', async () => {
    mockPost.mockResolvedValueOnce({ ok: true });
    const payload = { agree: true };

    const res = await request(buildApp()).post('/consent').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockPost).toHaveBeenCalledWith(payload, 'consent');
  });

  it('returns 500 on forward failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('boom'));
    const res = await request(buildApp()).post('/consent').send({});
    expect(res.status).toBe(500);
  });
});
