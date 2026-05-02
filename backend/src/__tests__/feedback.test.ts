import express from 'express';
import request from 'supertest';

jest.mock('../services/sheets', () => ({
  postToAppsScript: jest.fn(),
}));

import { postToAppsScript } from '../services/sheets';
import { feedbackRouter } from '../routes/feedback';

const mockPost = postToAppsScript as jest.MockedFunction<typeof postToAppsScript>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(feedbackRouter);
  return app;
}

describe('POST /feedback', () => {
  it('tags the payload as feedback and forwards to Apps Script', async () => {
    mockPost.mockResolvedValueOnce({ ok: true });
    const payload = { rating: 5 };

    const res = await request(buildApp()).post('/feedback').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockPost).toHaveBeenCalledWith(payload, 'feedback');
  });

  it('returns 500 on forward failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('boom'));
    const res = await request(buildApp()).post('/feedback').send({});
    expect(res.status).toBe(500);
  });
});
