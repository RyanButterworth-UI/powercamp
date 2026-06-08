import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
  },
}));

const selectMock = jest.fn();
const updateMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => selectMock(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => updateMock(),
        }),
      }),
    }),
  },
}));

const verifyMock = jest.fn();
jest.mock('../services/auth', () => ({
  verifyLeaderInviteToken: (token: string) => verifyMock(token),
}));

// /leaders/register now sends a completion email and upserts the Leaders
// sheet — stub both so the route under test makes no real Gmail / Sheets calls.
jest.mock('../services/email', () => ({
  sendLeaderApplicationNotice: jest.fn().mockResolvedValue(undefined),
  sendLeaderApplicationReceived: jest.fn().mockResolvedValue(undefined),
  sendLeaderRegistrationComplete: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn().mockResolvedValue(undefined),
  upsertToSheet: jest.fn().mockResolvedValue(undefined),
}));

import { leadersRouter } from '../routes/leaders';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(leadersRouter);
  return app;
}

describe('POST /leaders/verify-invite', () => {
  beforeEach(() => {
    selectMock.mockReset();
    verifyMock.mockReset();
  });

  it('returns 401 when the token is invalid', async () => {
    verifyMock.mockReturnValueOnce(null);
    const res = await request(buildApp())
      .post('/leaders/verify-invite')
      .send({ token: 'a'.repeat(20) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when the leader was deleted', async () => {
    verifyMock.mockReturnValueOnce({ leaderId: 5, kind: 'leader-invite' });
    selectMock.mockResolvedValueOnce([
      { id: 5, deletedAt: new Date(), status: 'approved', firstName: 'A', lastName: 'B', email: 'a@b.test' },
    ]);
    const res = await request(buildApp())
      .post('/leaders/verify-invite')
      .send({ token: 'a'.repeat(20) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when the leader is not approved (e.g. still pending)', async () => {
    verifyMock.mockReturnValueOnce({ leaderId: 5, kind: 'leader-invite' });
    selectMock.mockResolvedValueOnce([
      { id: 5, deletedAt: null, status: 'pending', firstName: 'A', lastName: 'B', email: 'a@b.test' },
    ]);
    const res = await request(buildApp())
      .post('/leaders/verify-invite')
      .send({ token: 'a'.repeat(20) });
    expect(res.status).toBe(403);
  });

  it('returns the leader with PII trimmed to the fields the registration form needs', async () => {
    verifyMock.mockReturnValueOnce({ leaderId: 5, kind: 'leader-invite' });
    selectMock.mockResolvedValueOnce([
      {
        id: 5,
        year: 2026,
        deletedAt: null,
        status: 'approved',
        firstName: 'Sam',
        lastName: 'Smith',
        email: 'sam@example.com',
        cell: '0820000000',
        gender: 'Male',
        age: '25',
        church: 'Hope',
        tshirt: 'large',
        applicationNotes: 'private notes', // must NOT be in the response
      },
    ]);
    const res = await request(buildApp())
      .post('/leaders/verify-invite')
      .send({ token: 'a'.repeat(20) });
    expect(res.status).toBe(200);
    expect(res.body.leader).toEqual({
      id: 5,
      firstName: 'Sam',
      lastName: 'Smith',
      email: 'sam@example.com',
      cell: '0820000000',
      gender: 'Male',
      age: '25',
      church: 'Hope',
      tshirt: 'large',
    });
    // Application notes are private — should never leave the backend.
    expect(JSON.stringify(res.body)).not.toContain('private notes');
  });
});

// The leader register form now mirrors the camper consent — a full block is
// mandatory, so every register body carries one.
const validConsent = {
  general: 'accept',
  location: 'accept',
  risk: 'accept',
  powerCamp: 'accept',
  behaviour: 'accept',
  photo: 'accept',
  emergencyName: 'Emergency Person',
  emergencyContact: '0820000099',
  medicalAidName: 'NONE',
  medicalAidNumber: 'NONE',
  date: '2026-07-01',
};

describe('POST /leaders/register', () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockReset();
    verifyMock.mockReset();
    // Default: the leader is still approved and not deleted, so register runs.
    selectMock.mockResolvedValue([{ id: 5, status: 'approved', deletedAt: null }]);
  });

  it('returns 400 when the mandatory consent block is missing', async () => {
    verifyMock.mockReturnValueOnce({ leaderId: 5, kind: 'leader-invite' });
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: 'a'.repeat(20), tshirt: 'large' });
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is invalid', async () => {
    verifyMock.mockReturnValueOnce(null);
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: 'a'.repeat(20), tshirt: 'large', consent: validConsent });
    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('saves the leader (incl. consent) and tags it with the current camp year on success', async () => {
    verifyMock.mockReturnValueOnce({ leaderId: 5, kind: 'leader-invite' });
    updateMock.mockResolvedValueOnce([{ id: 5, email: 'leader@real.co.za', firstName: 'Sam' }]);
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({
        token: 'a'.repeat(20),
        tshirt: 'large',
        cell: '0820000000',
        consent: validConsent,
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 5 });
    expect(updateMock).toHaveBeenCalled();
  });

  it('returns 404 when the leader id from the token has no matching row', async () => {
    verifyMock.mockReturnValueOnce({ leaderId: 99, kind: 'leader-invite' });
    selectMock.mockResolvedValueOnce([]); // re-check finds no leader → 404
    const res = await request(buildApp())
      .post('/leaders/register')
      .send({ token: 'a'.repeat(20), tshirt: 'large', consent: validConsent });
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
