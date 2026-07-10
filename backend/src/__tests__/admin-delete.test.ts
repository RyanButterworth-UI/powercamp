import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const ADMIN_HASH = bcrypt.hashSync('admin-pw', 4);
const DELETE_PW = 'test-delete-pw';
const DELETE_HASH = bcrypt.hashSync(DELETE_PW, 4);

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    ADMIN_PASSWORD_HASH: ADMIN_HASH,
    DELETE_PASSWORD_HASH: DELETE_HASH,
    REGISTRATION_ADMIN_EMAIL: 'powercamplife@gmail.com',
  },
}));

// db.update(t).set(vals).where(...).returning(cols) — awaited directly.
const mockSet = jest.fn();
const mockReturning = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    update: () => ({
      set: (vals: unknown) => {
        mockSet(vals);
        return { where: () => ({ returning: () => mockReturning() }) };
      },
    }),
  },
}));

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
  upsertToSheet: jest.fn(),
}));
jest.mock('../services/email', () => ({
  sendWaitlistNotification: jest.fn(),
  sendPaymentConfirmed: jest.fn(),
  sendLeaderInvite: jest.fn(),
  sendInviteSentReceipt: jest.fn(),
  sendLeaderRejection: jest.fn(),
  sendRegistrationUpdated: jest.fn(),
  renderBlocksToHtml: jest.fn(),
  blocksToPlainText: jest.fn(),
  sendBulkEmail: jest.fn(),
}));
jest.mock('../services/subscriptions', () => ({
  filterToSubscribed: jest.fn(),
  listSubscriptions: jest.fn(),
  setSubscribed: jest.fn(),
}));

import { signAdminToken } from '../services/auth';
import { adminRouter } from '../routes/admin';
import { waitlistRouter } from '../routes/waitlist';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  app.use(waitlistRouter);
  return app;
}

const adminAuth = () => `Bearer ${signAdminToken()}`;

beforeEach(() => {
  mockSet.mockReset();
  mockReturning.mockReset();
});

describe('the delete password gate', () => {
  it('rejects a request with no admin token as 401, before touching the DB', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/1/delete')
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(401);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('rejects a missing delete password with 400', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/1/delete')
      .set('Authorization', adminAuth())
      .send({});

    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });

  // 403 rather than 401 so the client can tell a wrong delete password apart
  // from an expired admin session, which need opposite responses.
  it('rejects a wrong delete password with 403, not 401', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/1/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: 'not-the-password' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/delete password/i);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric id with 400 even when the password is right', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/abc/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });
});

describe('POST /admin/campers/:id/delete', () => {
  it('stamps deleted_at rather than dropping the row', async () => {
    mockReturning.mockResolvedValueOnce([{ id: 42, firstName: 'Ryan', lastName: 'B' }]);

    const res = await request(buildApp())
      .post('/admin/campers/42/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42, deleted: true });
    expect(mockSet).toHaveBeenCalledTimes(1);
    const patch = mockSet.mock.calls[0][0] as { deletedAt: Date };
    expect(patch.deletedAt).toBeInstanceOf(Date);
  });

  // The WHERE carries `isNull(deletedAt)`, so a second click updates no rows.
  it('returns 404 when the camper is already deleted', async () => {
    mockReturning.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .post('/admin/campers/42/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(404);
  });
});

describe('POST /admin/leaders/:id/delete', () => {
  it('soft-deletes the leader', async () => {
    mockReturning.mockResolvedValueOnce([{ id: 7, firstName: 'Nadia', lastName: 'K' }]);

    const res = await request(buildApp())
      .post('/admin/leaders/7/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, deleted: true });
    expect((mockSet.mock.calls[0][0] as { deletedAt: Date }).deletedAt).toBeInstanceOf(Date);
  });

  it('returns 404 when the leader is already deleted', async () => {
    mockReturning.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .post('/admin/leaders/7/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(404);
  });
});

describe('POST /admin/waitlist/:id/delete', () => {
  it('soft-deletes the waiting-list entry', async () => {
    mockReturning.mockResolvedValueOnce([{ id: 3, camperName: 'Sam' }]);

    const res = await request(buildApp())
      .post('/admin/waitlist/3/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: DELETE_PW });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 3, deleted: true });
  });

  it('is gated by the same delete password', async () => {
    const res = await request(buildApp())
      .post('/admin/waitlist/3/delete')
      .set('Authorization', adminAuth())
      .send({ deletePassword: 'nope' });

    expect(res.status).toBe(403);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
