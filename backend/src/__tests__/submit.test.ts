import express from 'express';
import request from 'supertest';

jest.mock('../services/sheets', () => ({
  postToAppsScript: jest.fn(),
}));

import { postToAppsScript } from '../services/sheets';
import { submitRouter } from '../routes/submit';

const mockPost = postToAppsScript as jest.MockedFunction<typeof postToAppsScript>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(submitRouter);
  return app;
}

describe('POST /submit', () => {
  it('forwards body to Apps Script as a registration and returns the result', async () => {
    mockPost.mockResolvedValueOnce({ ok: true });
    const payload = { firstName: 'Jane', lastName: 'Doe' };

    const res = await request(buildApp()).post('/submit').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockPost).toHaveBeenCalledWith(payload, 'registration');
  });

  it('returns 500 if the Apps Script forward fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('boom'));

    const res = await request(buildApp()).post('/submit').send({ firstName: 'X' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to forward data' });
  });
});
