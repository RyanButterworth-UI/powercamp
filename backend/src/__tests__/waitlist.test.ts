import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    REGISTRATION_ADMIN_EMAIL: 'powercamplife@gmail.com',
  },
}));

const insertMock = jest.fn();
const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    insert: () => ({ values: (vals: unknown) => ({ returning: () => insertMock(vals) }) }),
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => selectMock() }) }) }),
  },
}));

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
  registrationRowExists: jest.fn(),
}));
jest.mock('../services/email', () => ({
  sendWaitlistNotification: jest.fn(),
  sendWaitlistConfirmation: jest.fn(),
  sendConsentRequest: jest.fn(),
  sendRegistrationReceived: jest.fn(),
}));

import { appendToSheet } from '../services/sheets';
import { sendWaitlistNotification, sendWaitlistConfirmation } from '../services/email';
import { signAdminToken } from '../services/auth';
import { waitlistRouter } from '../routes/waitlist';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;
const mockNotify = sendWaitlistNotification as jest.MockedFunction<typeof sendWaitlistNotification>;
const mockConfirm = sendWaitlistConfirmation as jest.MockedFunction<typeof sendWaitlistConfirmation>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(waitlistRouter);
  return app;
}

const camper = {
  firstName: 'Sam',
  lastName: 'Smith',
  parentEmail: 'PAT@Example.com',
  grade: '9',
  parentName: 'Pat Smith',
  parentPhone: '0821234567',
};
const consent = {
  general: 'accept',
  location: 'accept',
  risk: 'accept',
  powerCamp: 'accept',
  behaviour: 'accept',
  photo: 'accept',
  emergencyName: 'Pat Smith',
  emergencyContact: '0821234567',
  medicalAidName: 'NONE',
  medicalAidNumber: 'NONE',
  date: '2026-07-23',
};

describe('POST /waitlist (full flow)', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue([{ id: 7 }]);
    mockAppend.mockReset().mockResolvedValue(undefined);
    mockNotify.mockReset().mockResolvedValue(undefined);
    mockConfirm.mockReset().mockResolvedValue(undefined);
  });

  it('stores the full record, derives camperName, lowercases the parent email', async () => {
    const res = await request(buildApp()).post('/waitlist').send({ camper, note: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 7, ok: true, consentCaptured: false });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        camperName: 'Sam Smith',
        firstName: 'Sam',
        lastName: 'Smith',
        parentEmail: 'pat@example.com',
        phone: '0821234567',
        grade: '9',
      })
    );
  });

  it('stamps consent when the consent block is provided', async () => {
    const res = await request(buildApp()).post('/waitlist').send({ camper, consent });
    expect(res.status).toBe(200);
    expect(res.body.consentCaptured).toBe(true);
    const vals = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(vals.consentGeneral).toBe('accept');
    expect(vals.consentAcceptedAt).toBeInstanceOf(Date);
  });

  it('emails the family a waiting-list confirmation and pings the admin', async () => {
    await request(buildApp()).post('/waitlist').send({ camper });
    await new Promise((r) => setImmediate(r));
    expect(mockConfirm).toHaveBeenCalledWith('pat@example.com', 'Sam', undefined);
    expect(mockNotify).toHaveBeenCalledWith(
      'powercamplife@gmail.com',
      expect.objectContaining({ camperName: 'Sam Smith', parentEmail: 'pat@example.com' })
    );
  });

  it('mirrors a summary row to the Waitlist sheet tab', async () => {
    await request(buildApp()).post('/waitlist').send({ camper });
    await new Promise((r) => setImmediate(r));
    expect(mockAppend).toHaveBeenCalledWith(
      'Waitlist',
      expect.arrayContaining(['Sam Smith', 'pat@example.com'])
    );
  });

  it('rejects a missing camper name with 400', async () => {
    const res = await request(buildApp())
      .post('/waitlist')
      .send({ camper: { parentEmail: 'pat@example.com' } });
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid parent email with 400', async () => {
    const res = await request(buildApp())
      .post('/waitlist')
      .send({ camper: { firstName: 'Sam', lastName: 'Smith', parentEmail: 'not-an-email' } });
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/waitlist', () => {
  beforeEach(() => selectMock.mockReset());

  it('requires an admin token', async () => {
    const res = await request(buildApp()).get('/admin/waitlist');
    expect(res.status).toBe(401);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns the rows for an authed admin', async () => {
    selectMock.mockResolvedValue([{ id: 7, camperName: 'Sam Smith' }]);
    const res = await request(buildApp())
      .get('/admin/waitlist')
      .set('Authorization', `Bearer ${signAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 1, waitlist: [{ id: 7, camperName: 'Sam Smith' }] });
  });
});
