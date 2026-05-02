import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const ADMIN_HASH = bcrypt.hashSync('admin-pw', 4);

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    ADMIN_PASSWORD_HASH: ADMIN_HASH,
  },
}));

const selectMock = jest.fn();
const updateMock = jest.fn();
const insertMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => selectMock() }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({ returning: () => updateMock() }),
      }),
    }),
    insert: () => ({
      values: () => ({ returning: () => insertMock() }),
    }),
  },
}));

const sheetMock = jest.fn();
jest.mock('../services/sheets', () => ({
  appendToSheet: (...args: unknown[]) => sheetMock(...args),
}));

import { signAdminToken } from '../services/auth';
import { adminRouter } from '../routes/admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

const adminAuth = () => `Bearer ${signAdminToken()}`;

describe('GET /admin/leaders', () => {
  beforeEach(() => selectMock.mockReset());

  it('401 without admin token', async () => {
    const res = await request(buildApp()).get('/admin/leaders');
    expect(res.status).toBe(401);
  });

  it('returns the leader list with admin token', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 1, firstName: 'Sam', lastName: 'Smith', status: 'pending', year: 2026 },
    ]);
    const res = await request(buildApp()).get('/admin/leaders').set('Authorization', adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.leaders[0].firstName).toBe('Sam');
  });
});

describe('POST /admin/leaders/:id/approve', () => {
  beforeEach(() => updateMock.mockReset());

  it('401 without admin token', async () => {
    const res = await request(buildApp()).post('/admin/leaders/1/approve').send({ neilPassword: 'gravelROx' });
    expect(res.status).toBe(401);
  });

  it('401 with admin token but wrong Neil password', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/1/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/neil/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('approves the leader with admin token + correct Neil password', async () => {
    updateMock.mockResolvedValueOnce([{ id: 1 }]);
    const res = await request(buildApp())
      .post('/admin/leaders/1/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'gravelROx' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, status: 'approved' });
  });

  it('returns 404 when no leader matches the id', async () => {
    updateMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/admin/leaders/9999/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'gravelROx' });
    expect(res.status).toBe(404);
  });

  it('rejects non-numeric ids with 400', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/abc/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'gravelROx' });
    expect(res.status).toBe(400);
  });
});

describe('POST /admin/leaders/:id/reject', () => {
  beforeEach(() => updateMock.mockReset());

  it('rejects with admin + Neil', async () => {
    updateMock.mockResolvedValueOnce([{ id: 1 }]);
    const res = await request(buildApp())
      .post('/admin/leaders/1/reject')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'gravelROx' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, status: 'rejected' });
  });

  it('401 with wrong Neil password', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/1/reject')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('POST /admin/leaders/direct-add', () => {
  beforeEach(() => {
    insertMock.mockReset();
    sheetMock.mockReset().mockResolvedValue(undefined);
  });

  const validPayload = {
    neilPassword: 'gravelROx',
    firstName: 'Direct',
    lastName: 'Add',
    email: 'direct@example.com',
  };

  it('401 without admin token', async () => {
    const res = await request(buildApp()).post('/admin/leaders/direct-add').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('401 with wrong Neil password', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/direct-add')
      .set('Authorization', adminAuth())
      .send({ ...validPayload, neilPassword: 'wrong' });
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('inserts an approved leader with admin + correct Neil password', async () => {
    insertMock.mockResolvedValueOnce([{ id: 50 }]);
    const res = await request(buildApp())
      .post('/admin/leaders/direct-add')
      .set('Authorization', adminAuth())
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 50, status: 'approved' });
  });

  it('appends a row to the Leaders sheet tab with status=approved and approvedByNeil=TRUE', async () => {
    insertMock.mockResolvedValueOnce([{ id: 50 }]);

    await request(buildApp())
      .post('/admin/leaders/direct-add')
      .set('Authorization', adminAuth())
      .send(validPayload);
    await new Promise((resolve) => setImmediate(resolve));

    expect(sheetMock).toHaveBeenCalledTimes(1);
    const [tab, row] = sheetMock.mock.calls[0]!;
    expect(tab).toBe('Leaders');
    expect(row[13]).toBe('approved');
    expect(row[14]).toBe('TRUE');
  });

  it('rejects malformed bodies with 400', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/direct-add')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'gravelROx', firstName: 'X' });
    expect(res.status).toBe(400);
  });
});
