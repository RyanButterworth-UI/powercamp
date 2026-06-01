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
    insert: () => ({
      values: (vals: unknown) => ({
        returning: () => insertMock(vals),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => selectMock() }),
      }),
    }),
  },
}));

jest.mock('../services/sheets', () => ({ appendToSheet: jest.fn() }));
jest.mock('../services/email', () => ({ sendWaitlistNotification: jest.fn() }));

import { appendToSheet } from '../services/sheets';
import { sendWaitlistNotification } from '../services/email';
import { signAdminToken } from '../services/auth';
import { waitlistRouter } from '../routes/waitlist';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;
const mockNotify = sendWaitlistNotification as jest.MockedFunction<typeof sendWaitlistNotification>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(waitlistRouter);
  return app;
}

const validBody = {
  camperName: 'Sam Smith',
  parentName: 'Pat Smith',
  parentEmail: 'PAT@Example.com',
  phone: '0821234567',
  grade: '9',
  note: 'Please add us if a spot opens.',
};

describe('POST /waitlist', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue([{ id: 7 }]);
    mockAppend.mockReset().mockResolvedValue(undefined);
    mockNotify.mockReset().mockResolvedValue(undefined);
  });

  it('persists the entry with the camp year and lowercased parent email', async () => {
    const res = await request(buildApp()).post('/waitlist').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, ok: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        camperName: 'Sam Smith',
        parentEmail: 'pat@example.com',
        grade: '9',
      })
    );
  });

  it('notifies the admin mailbox (best-effort)', async () => {
    await request(buildApp()).post('/waitlist').send(validBody);
    await new Promise((r) => setImmediate(r));
    expect(mockNotify).toHaveBeenCalledWith(
      'powercamplife@gmail.com',
      expect.objectContaining({ camperName: 'Sam Smith', parentEmail: 'pat@example.com' })
    );
  });

  it('mirrors the entry to the Waitlist sheet tab', async () => {
    await request(buildApp()).post('/waitlist').send(validBody);
    await new Promise((r) => setImmediate(r));
    expect(mockAppend).toHaveBeenCalledWith('Waitlist', expect.arrayContaining(['Sam Smith', 'pat@example.com']));
  });

  it('rejects a missing camper name with 400', async () => {
    const res = await request(buildApp())
      .post('/waitlist')
      .send({ parentEmail: 'pat@example.com' });
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid parent email with 400', async () => {
    const res = await request(buildApp())
      .post('/waitlist')
      .send({ camperName: 'Sam', parentEmail: 'not-an-email' });
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
