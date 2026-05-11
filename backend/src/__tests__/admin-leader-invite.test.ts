import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const ADMIN_HASH = bcrypt.hashSync('admin-pw', 4);
const NEIL_PW = 'test-neil-pw';
const NEIL_HASH = bcrypt.hashSync(NEIL_PW, 4);

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    ADMIN_PASSWORD_HASH: ADMIN_HASH,
    NEIL_PASSWORD_HASH: NEIL_HASH,
    APP_BASE_URL: 'https://example.test',
    NEIL_EMAIL: 'neil@example.test',
    GMAIL_USER: 'gmail@example.test',
  },
}));

// Single-row select for the invite endpoint: db.select().from(leaders).where(...)
// is awaited directly (no orderBy). The chain therefore needs to be thenable.
const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => {
        const chain = {
          where: () => chain,
          then: (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(selectMock()).then(resolve, reject),
        };
        return chain;
      },
    }),
  },
}));

const inviteMock = jest.fn();
const receiptMock = jest.fn();
jest.mock('../services/email', () => ({
  sendLeaderInvite: (...args: unknown[]) => inviteMock(...args),
  sendInviteSentReceipt: (...args: unknown[]) => receiptMock(...args),
  // Other senders that admin.ts imports — stubbed so module load succeeds.
  sendPaymentConfirmed: jest.fn(),
  renderBlocksToHtml: jest.fn(),
  blocksToPlainText: jest.fn(),
  sendBulkEmail: jest.fn(),
}));

// Subscriptions service is also imported by admin.ts.
jest.mock('../services/subscriptions', () => ({
  filterToSubscribed: jest.fn(),
  listSubscriptions: jest.fn(),
  setSubscribed: jest.fn(),
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
const approvedLeader = {
  id: 7,
  firstName: 'Nadia',
  lastName: 'Tester',
  email: 'nadia@example.test',
  status: 'approved' as const,
  deletedAt: null,
};

describe('POST /admin/leaders/:id/invite', () => {
  beforeEach(() => {
    selectMock.mockReset();
    inviteMock.mockReset().mockResolvedValue(undefined);
    receiptMock.mockReset().mockResolvedValue(undefined);
  });

  it('401 without admin token', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/7/invite')
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(401);
    expect(inviteMock).not.toHaveBeenCalled();
  });

  // Regression: isNeilOk was switched to async (returns a Promise). The
  // approve + reject routes were updated to `await isNeilOk(...)`; this one
  // wasn't. !Promise is always false, so the 401 branch never ran and any
  // request with admin token + bogus Neil password sailed through.
  it('401 with admin token but WRONG Neil password (regression: missing await)', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/7/invite')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'definitely-wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/neil/i);
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it('400 on non-numeric leader id', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/abc/invite')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(400);
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it('404 if leader not found', async () => {
    selectMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/admin/leaders/7/invite')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(404);
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it('400 if leader is not approved yet', async () => {
    selectMock.mockResolvedValueOnce([{ ...approvedLeader, status: 'pending' }]);
    const res = await request(buildApp())
      .post('/admin/leaders/7/invite')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/approved/i);
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it('sends the invite when admin + Neil + leader status check all pass', async () => {
    selectMock.mockResolvedValueOnce([approvedLeader]);
    const res = await request(buildApp())
      .post('/admin/leaders/7/invite')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, sentTo: 'nadia@example.test' });
    expect(inviteMock).toHaveBeenCalledTimes(1);
    expect(inviteMock).toHaveBeenCalledWith(
      'nadia@example.test',
      'Nadia',
      expect.stringContaining('/leader-register?token=')
    );
  });
});
