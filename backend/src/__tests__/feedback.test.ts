import express from 'express';
import request from 'supertest';

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
}));

import { appendToSheet } from '../services/sheets';
import { feedbackRouter } from '../routes/feedback';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(feedbackRouter);
  return app;
}

describe('POST /feedback', () => {
  beforeEach(() => {
    mockAppend.mockResolvedValue(undefined);
  });

  it('appends the body values to the Feedback tab with a leading timestamp', async () => {
    const res = await request(buildApp()).post('/feedback').send({ rating: 5, comment: 'great' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockAppend).toHaveBeenCalledWith('Feedback', expect.arrayContaining(['5', 'great']));
  });

  it('returns 500 if appendToSheet fails', async () => {
    mockAppend.mockRejectedValueOnce(new Error('boom'));
    const res = await request(buildApp()).post('/feedback').send({});
    expect(res.status).toBe(500);
  });
});
