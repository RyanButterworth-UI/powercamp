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

const selectMock = jest.fn();   // list select: .where().orderBy()
const rowSelectMock = jest.fn(); // single-row select: .where() awaited (approve/reject re-read)
const updateMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => {
        const chain = {
          where: () => chain,
          orderBy: () => selectMock(),
          then: (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(rowSelectMock()).then(resolve, reject),
        };
        return chain;
      },
    }),
    update: () => ({
      set: () => ({
        where: () => ({ returning: () => updateMock() }),
      }),
    }),
  },
}));

// Approve emails the registration link; reject emails a decline. Both upsert
// the Leaders sheet. Mock the side-effect services so the decision endpoints
// can be asserted without real Gmail / Google Sheets calls.
const inviteMock = jest.fn();
const rejectionMock = jest.fn();
jest.mock('../services/email', () => ({
  sendLeaderInvite: (...args: unknown[]) => inviteMock(...args),
  sendLeaderRejection: (...args: unknown[]) => rejectionMock(...args),
  // Other senders admin.ts (and leaders.ts, imported for leaderRow) reference.
  sendInviteSentReceipt: jest.fn(),
  sendPaymentConfirmed: jest.fn(),
  renderBlocksToHtml: jest.fn(),
  blocksToPlainText: jest.fn(),
  sendBulkEmail: jest.fn(),
  sendLeaderApplicationNotice: jest.fn(),
  sendLeaderApplicationReceived: jest.fn(),
}));

const sheetMock = jest.fn();
jest.mock('../services/sheets', () => ({
  upsertToSheet: (...args: unknown[]) => sheetMock(...args),
  appendToSheet: jest.fn(),
}));

jest.mock('../services/subscriptions', () => ({
  filterToSubscribed: jest.fn(),
  listSubscriptions: jest.fn(),
  setSubscribed: jest.fn(),
  ensureSubscription: jest.fn(),
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

const leaderRowReturn = {
  id: 1,
  firstName: 'Sam',
  lastName: 'Smith',
  email: 'sam@example.test',
  cell: null,
  gender: null,
  age: null,
  grade: null,
  church: 'Hope',
  tshirt: null,
  parentName: null,
  parentPhone: null,
  parentEmail: null,
  applicationNotes: null,
  status: 'pending',
  approvedByNeil: false,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
};

describe('POST /admin/leaders/:id/approve', () => {
  beforeEach(() => {
    updateMock.mockReset();
    inviteMock.mockReset().mockResolvedValue(undefined);
    sheetMock.mockReset().mockResolvedValue(undefined);
    // Default: a pending, non-deleted leader exists, so approve proceeds.
    rowSelectMock.mockReset().mockResolvedValue([{ ...leaderRowReturn, status: 'pending', deletedAt: null }]);
  });

  it('401 without admin token', async () => {
    const res = await request(buildApp()).post('/admin/leaders/1/approve').send({ neilPassword: NEIL_PW });
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
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it('approves AND emails the leader their registration link, and syncs the sheet', async () => {
    updateMock.mockResolvedValueOnce([leaderRowReturn]);
    const res = await request(buildApp())
      .post('/admin/leaders/1/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, status: 'approved', invitedTo: 'sam@example.test' });
    // Registration link emailed directly on approval.
    expect(inviteMock).toHaveBeenCalledTimes(1);
    expect(inviteMock).toHaveBeenCalledWith(
      'sam@example.test',
      'Sam',
      expect.stringContaining('/leader-register?token=')
    );
    // Leaders sheet row upserted to approved (keyed on the email column, idx 4).
    expect(sheetMock).toHaveBeenCalledTimes(1);
    const [tab, row, keyCols] = sheetMock.mock.calls[0]!;
    expect(tab).toBe('Leaders');
    expect(row[13]).toBe('approved');
    expect(row[14]).toBe('TRUE');
    expect(keyCols).toEqual([4]);
  });

  it('is idempotent: a second approve of an already-approved leader does NOT re-email or re-write the sheet', async () => {
    rowSelectMock.mockResolvedValueOnce([{ ...leaderRowReturn, status: 'approved', deletedAt: null }]);
    const res = await request(buildApp())
      .post('/admin/leaders/1/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, status: 'approved', invitedTo: 'sam@example.test', alreadyApproved: true });
    expect(updateMock).not.toHaveBeenCalled();
    expect(inviteMock).not.toHaveBeenCalled();
    expect(sheetMock).not.toHaveBeenCalled();
  });

  it('returns 404 when no leader matches the id (no email, no sheet write)', async () => {
    rowSelectMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/admin/leaders/9999/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
    expect(inviteMock).not.toHaveBeenCalled();
    expect(sheetMock).not.toHaveBeenCalled();
  });

  it('rejects non-numeric ids with 400', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/abc/approve')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    expect(res.status).toBe(400);
  });
});

describe('POST /admin/leaders/:id/reject', () => {
  beforeEach(() => {
    updateMock.mockReset();
    rejectionMock.mockReset().mockResolvedValue(undefined);
    sheetMock.mockReset().mockResolvedValue(undefined);
    // Default: a pending, non-deleted leader exists, so reject proceeds.
    rowSelectMock.mockReset().mockResolvedValue([{ ...leaderRowReturn, status: 'pending', deletedAt: null }]);
  });

  it('rejects AND emails the applicant a decline, and syncs the sheet', async () => {
    updateMock.mockResolvedValueOnce([leaderRowReturn]);
    const res = await request(buildApp())
      .post('/admin/leaders/1/reject')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, status: 'rejected' });
    expect(rejectionMock).toHaveBeenCalledTimes(1);
    expect(rejectionMock).toHaveBeenCalledWith('sam@example.test', 'Sam');
    expect(sheetMock).toHaveBeenCalledTimes(1);
    const [tab, row] = sheetMock.mock.calls[0]!;
    expect(tab).toBe('Leaders');
    expect(row[13]).toBe('rejected');
    expect(row[14]).toBe('FALSE');
  });

  it('is idempotent: re-rejecting an already-rejected leader does NOT re-email or re-write the sheet', async () => {
    rowSelectMock.mockResolvedValueOnce([{ ...leaderRowReturn, status: 'rejected', deletedAt: null }]);
    const res = await request(buildApp())
      .post('/admin/leaders/1/reject')
      .set('Authorization', adminAuth())
      .send({ neilPassword: NEIL_PW });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, status: 'rejected', alreadyRejected: true });
    expect(updateMock).not.toHaveBeenCalled();
    expect(rejectionMock).not.toHaveBeenCalled();
    expect(sheetMock).not.toHaveBeenCalled();
  });

  it('401 with wrong Neil password', async () => {
    const res = await request(buildApp())
      .post('/admin/leaders/1/reject')
      .set('Authorization', adminAuth())
      .send({ neilPassword: 'wrong' });
    expect(res.status).toBe(401);
    expect(rejectionMock).not.toHaveBeenCalled();
  });
});

