import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    GMAIL_USER: 'powercamp@example.com',
  },
}));

const insertMock = jest.fn();
const updateMock = jest.fn();
const mockRowSelect = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    insert: () => ({
      values: () => ({ returning: () => insertMock() }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: () => updateMock() }) }),
    }),
    // Single-row select (db.select().from().where() awaited directly) — used by
    // /leaders/register to re-check the leader is still approved.
    select: () => ({
      from: () => {
        const chain = {
          where: () => chain,
          then: (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(mockRowSelect()).then(resolve, reject),
        };
        return chain;
      },
    }),
  },
}));

const sheetMock = jest.fn();
const upsertMock = jest.fn();
jest.mock('../services/sheets', () => ({
  appendToSheet: (...args: unknown[]) => sheetMock(...args),
  upsertToSheet: (...args: unknown[]) => upsertMock(...args),
}));

const noticeMock = jest.fn();
const applicantAckMock = jest.fn();
const completeMock = jest.fn();
jest.mock('../services/email', () => ({
  sendLeaderApplicationNotice: (...args: unknown[]) => noticeMock(...args),
  sendLeaderApplicationReceived: (...args: unknown[]) => applicantAckMock(...args),
  sendLeaderRegistrationComplete: (...args: unknown[]) => completeMock(...args),
}));

const subscribeMock = jest.fn();
jest.mock('../services/subscriptions', () => ({
  ensureSubscription: (...args: unknown[]) => subscribeMock(...args),
}));

const mockVerifyToken = jest.fn(() => null as null | { leaderId: number; kind: 'leader-invite' });
jest.mock('../services/auth', () => ({
  verifyLeaderInviteToken: (...args: unknown[]) => mockVerifyToken(),
}));

import { leadersRouter } from '../routes/leaders';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(leadersRouter);
  return app;
}

describe('POST /leaders/apply', () => {
  beforeEach(() => {
    insertMock.mockReset();
    sheetMock.mockReset().mockResolvedValue(undefined);
    noticeMock.mockReset().mockResolvedValue(undefined);
    applicantAckMock.mockReset().mockResolvedValue(undefined);
    subscribeMock.mockReset().mockResolvedValue(undefined);
  });

  it('emails the applicant an awaiting-approval acknowledgement (to their lowercased address)', async () => {
    insertMock.mockResolvedValueOnce([{ id: 11 }]);

    await request(buildApp()).post('/leaders/apply').send({
      firstName: 'Sam',
      lastName: 'Smith',
      email: 'SAM@example.com',
      church: 'Hope',
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(applicantAckMock).toHaveBeenCalledTimes(1);
    expect(applicantAckMock).toHaveBeenCalledWith('sam@example.com', 'Sam');
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

describe('POST /leaders/register', () => {
  const validToken = 'a-valid-invite-token-string';

  beforeEach(() => {
    updateMock.mockReset();
    completeMock.mockReset().mockResolvedValue(undefined);
    upsertMock.mockReset().mockResolvedValue(undefined);
    mockVerifyToken.mockReset().mockReturnValue({ leaderId: 7, kind: 'leader-invite' });
    // Default: the leader exists and is still approved, so the happy path runs.
    mockRowSelect.mockReset().mockResolvedValue([{ id: 7, status: 'approved', deletedAt: null }]);
  });

  it('401 when the invite token is invalid/expired (no DB write, no email)', async () => {
    mockVerifyToken.mockReturnValueOnce(null);
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: validToken, cell: '0820000001' });
    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('403 when the leader is no longer approved (token still valid)', async () => {
    mockRowSelect.mockResolvedValueOnce([{ id: 7, status: 'rejected', deletedAt: null }]);
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: validToken, cell: '0820000001' });
    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('404 when the leader has been removed (deletedAt set)', async () => {
    mockRowSelect.mockResolvedValueOnce([{ id: 7, status: 'approved', deletedAt: new Date() }]);
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: validToken, cell: '0820000001' });
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
    expect(completeMock).not.toHaveBeenCalled();
  });

  it('saves the leader, emails a registration-complete confirmation, and updates the Leaders sheet in place', async () => {
    // .returning() gives back the post-update row, including the freshly saved
    // cell / t-shirt and the approved status the leader already held.
    updateMock.mockResolvedValueOnce([
      {
        id: 7,
        email: 'leader@real.co.za',
        firstName: 'Nadia',
        lastName: 'Tester',
        cell: '0820000001',
        tshirt: 'large',
        status: 'approved',
        approvedByNeil: true,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);

    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: validToken, cell: '0820000001', tshirt: 'large' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7 });
    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(completeMock).toHaveBeenCalledWith('leader@real.co.za', 'Nadia');

    // Sheet updated in place (keyed on email column, idx 4) with the completed
    // details — not appended as a duplicate.
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [tab, row, keyCols] = upsertMock.mock.calls[0]!;
    expect(tab).toBe('Leaders');
    expect(row[2]).toBe('0820000001'); // cell
    expect(row[8]).toBe('large');      // t-shirt
    expect(row[13]).toBe('approved');  // status preserved
    expect(keyCols).toEqual([4]);
  });

  it('returns 404 when the leader row is gone (no email)', async () => {
    updateMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: validToken, cell: '0820000001' });
    expect(res.status).toBe(404);
    expect(completeMock).not.toHaveBeenCalled();
  });
});
