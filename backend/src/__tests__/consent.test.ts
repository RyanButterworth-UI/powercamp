import express from 'express';
import request from 'supertest';

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
}));

import { appendToSheet } from '../services/sheets';
import { consentRouter } from '../routes/consent';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(consentRouter);
  return app;
}

describe('POST /consent', () => {
  beforeEach(() => {
    mockAppend.mockResolvedValue(undefined);
  });

  it('appends the body values to the Consent tab with a leading timestamp', async () => {
    const res = await request(buildApp()).post('/consent').send({ name: 'Jane', agree: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockAppend).toHaveBeenCalledWith('Consent', expect.arrayContaining(['Jane', 'true']));
    const row = mockAppend.mock.calls[0]![1] as string[];
    expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns 500 if appendToSheet fails', async () => {
    mockAppend.mockRejectedValueOnce(new Error('boom'));
    const res = await request(buildApp()).post('/consent').send({});
    expect(res.status).toBe(500);
  });
});
