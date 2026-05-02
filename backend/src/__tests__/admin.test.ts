import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const STORED_HASH = bcrypt.hashSync('correct-horse-battery-staple', 4);

jest.mock('../env', () => ({
  env: {
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    ADMIN_PASSWORD_HASH: STORED_HASH,
  },
}));

const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => selectMock() }),
      }),
    }),
  },
}));

import { signAdminToken } from '../services/auth';
import { adminRouter } from '../routes/admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

describe('POST /admin/login', () => {
  it('returns a JWT on the correct password', async () => {
    const res = await request(buildApp()).post('/admin/login').send({
      password: 'correct-horse-battery-staple',
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('returns 401 on the wrong password', async () => {
    const res = await request(buildApp()).post('/admin/login').send({ password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects an empty body with 400', async () => {
    const res = await request(buildApp()).post('/admin/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/campers', () => {
  beforeEach(() => selectMock.mockReset());

  it('returns 401 without a Bearer token', async () => {
    const res = await request(buildApp()).get('/admin/campers');
    expect(res.status).toBe(401);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns 401 with a non-admin JWT', async () => {
    const res = await request(buildApp())
      .get('/admin/campers')
      .set('Authorization', 'Bearer some.bogus.token');
    expect(res.status).toBe(401);
  });

  it('returns the campers list with a valid admin token', async () => {
    selectMock.mockResolvedValueOnce([
      { id: 1, firstName: 'Ryan', lastName: 'B', year: 2025, parentEmail: 'r@e.com' },
    ]);

    const res = await request(buildApp())
      .get('/admin/campers')
      .set('Authorization', `Bearer ${signAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.campers[0].firstName).toBe('Ryan');
  });
});

describe('GET /admin/export', () => {
  beforeEach(() => selectMock.mockReset());

  it('returns 401 without a Bearer token', async () => {
    const res = await request(buildApp()).get('/admin/export');
    expect(res.status).toBe(401);
  });

  it('returns an XLSX attachment with the configured filename when authorised', async () => {
    selectMock.mockResolvedValueOnce([
      {
        id: 1,
        year: 2026,
        firstName: 'Ryan',
        lastName: 'Butterworth',
        parentEmail: 'r@e.com',
        friends: [],
        consentAcceptedAt: null,
        paymentReceivedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const res = await request(buildApp())
      .get('/admin/export')
      .set('Authorization', `Bearer ${signAdminToken()}`)
      .buffer(true)
      .parse((response, cb) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/spreadsheetml/);
    expect(res.header['content-disposition']).toMatch(/attachment;\s*filename="powercamp-export-/);
    // XLSX files are zip archives — first two bytes are 'PK' (0x50 0x4B).
    const buf = res.body as Buffer;
    expect(buf.length).toBeGreaterThan(0);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});

describe('GET /admin/me', () => {
  it('returns 200 ok for a valid admin token', async () => {
    const res = await request(buildApp())
      .get('/admin/me')
      .set('Authorization', `Bearer ${signAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 401 without a token', async () => {
    expect((await request(buildApp()).get('/admin/me')).status).toBe(401);
  });
});
