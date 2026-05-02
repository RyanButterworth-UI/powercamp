import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: { JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long' },
}));

const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => selectMock() }) }),
  },
}));

import { signMagicToken } from '../services/auth';
import { verifyLinkRouter } from '../routes/verify-link';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(verifyLinkRouter);
  return app;
}

describe('POST /verify-link', () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it('returns the camper data for a valid token', async () => {
    const token = signMagicToken(7);
    selectMock.mockResolvedValueOnce([
      {
        id: 7,
        year: 2025,
        firstName: 'Ryan',
        lastName: 'Butterworth',
        email: 'ryan@example.com',
        parentEmail: 'ryan@example.com',
        parentName: 'Test Parent',
        parentPhone: '0820000000',
        camperCell: '0820000001',
        gender: 'Male',
        age: '16',
        grade: '11',
        friends: [],
        medical: '',
        church: 'Test Church',
        tshirt: 'M',
        generalInfo: '',
        dob: '2009-01-01',
        deletedAt: null,
      },
    ]);

    const res = await request(buildApp()).post('/verify-link').send({ token });

    expect(res.status).toBe(200);
    expect(res.body.camper).toMatchObject({
      id: 7,
      firstName: 'Ryan',
      lastName: 'Butterworth',
      parentEmail: 'ryan@example.com',
      year: 2025,
    });
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(buildApp())
      .post('/verify-link')
      .send({ token: 'completely-bogus-token-string-here' });
    expect(res.status).toBe(401);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the camper has been soft-deleted', async () => {
    const token = signMagicToken(7);
    selectMock.mockResolvedValueOnce([
      { id: 7, deletedAt: new Date(), firstName: 'X', parentEmail: 'x@x.com' },
    ]);

    const res = await request(buildApp()).post('/verify-link').send({ token });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the camper id no longer exists', async () => {
    const token = signMagicToken(7);
    selectMock.mockResolvedValueOnce([]);

    const res = await request(buildApp()).post('/verify-link').send({ token });
    expect(res.status).toBe(404);
  });

  it('rejects malformed bodies with 400', async () => {
    expect((await request(buildApp()).post('/verify-link').send({})).status).toBe(400);
    expect(
      (await request(buildApp()).post('/verify-link').send({ token: 'short' })).status
    ).toBe(400);
  });
});
