import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const LEADER_HASH = bcrypt.hashSync('correct-leader-password', 4);

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    LEADER_PASSWORD_HASH: LEADER_HASH,
  },
}));

const insertMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    insert: () => ({
      values: () => ({ returning: () => insertMock() }),
    }),
  },
}));

const sheetMock = jest.fn();
jest.mock('../services/sheets', () => ({
  appendToSheet: (...args: unknown[]) => sheetMock(...args),
}));

import { leadersRouter } from '../routes/leaders';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(leadersRouter);
  return app;
}

describe('POST /leaders/check-password', () => {
  it('returns ok on the correct leader password', async () => {
    const res = await request(buildApp())
      .post('/leaders/check-password')
      .send({ password: 'correct-leader-password' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 401 on the wrong password', async () => {
    const res = await request(buildApp())
      .post('/leaders/check-password')
      .send({ password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty body with 400', async () => {
    const res = await request(buildApp()).post('/leaders/check-password').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /leaders/apply', () => {
  beforeEach(() => {
    insertMock.mockReset();
    sheetMock.mockReset().mockResolvedValue(undefined);
  });

  it('inserts a pending leader row tagged with CAMP_YEAR and approvedByNeil=false', async () => {
    insertMock.mockResolvedValueOnce([{ id: 11 }]);

    const res = await request(buildApp())
      .post('/leaders/apply')
      .send({
        firstName: 'Sam',
        lastName: 'Smith',
        email: 'SAM@example.com',
        grade: 'leader',
        church: 'Hope',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 11 });
    expect(insertMock).toHaveBeenCalled();
  });

  it('appends a row to the Leaders sheet tab with status=pending and approvedByNeil=FALSE', async () => {
    insertMock.mockResolvedValueOnce([{ id: 11 }]);

    await request(buildApp()).post('/leaders/apply').send({
      firstName: 'Sam',
      lastName: 'Smith',
      email: 'SAM@example.com',
      church: 'Hope',
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(sheetMock).toHaveBeenCalledTimes(1);
    const [tab, row] = sheetMock.mock.calls[0]!;
    expect(tab).toBe('Leaders');
    expect(row[0]).toBe('Sam');
    expect(row[1]).toBe('Smith');
    expect(row[4]).toBe('sam@example.com');
    expect(row[13]).toBe('pending');
    expect(row[14]).toBe('FALSE');
  });

  it('rejects malformed bodies with 400', async () => {
    const res = await request(buildApp())
      .post('/leaders/apply')
      .send({ firstName: 'Sam' });
    expect(res.status).toBe(400);
  });

  it('returns 500 if the DB insert throws', async () => {
    insertMock.mockRejectedValueOnce(new Error('db down'));
    const res = await request(buildApp())
      .post('/leaders/apply')
      .send({ firstName: 'Sam', lastName: 'Smith', email: 'sam@e.com' });
    expect(res.status).toBe(500);
  });
});
