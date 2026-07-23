import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    APP_BASE_URL: 'http://localhost:4200',
    REGISTRATION_ADMIN_EMAIL: 'powercamplife@gmail.com',
  },
}));

// Flexible db mock: select().from().where().limit() drains a queue so the two
// selects in the handler (load entry, then duplicate-guard) can return
// different results; insert/update capture their payloads.
const limitMock = jest.fn();
const insertValuesMock = jest.fn();
const updateSetMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => limitMock() }) }) }),
    insert: () => ({
      values: (v: unknown) => {
        insertValuesMock(v);
        return { returning: () => Promise.resolve([{ id: 42 }]) };
      },
    }),
    update: () => ({
      set: (v: unknown) => {
        updateSetMock(v);
        return { where: () => Promise.resolve([]) };
      },
    }),
  },
}));

const appendMock = jest.fn();
const rowExistsMock = jest.fn();
jest.mock('../services/sheets', () => ({
  appendToSheet: (...a: unknown[]) => appendMock(...a),
  registrationRowExists: (...a: unknown[]) => rowExistsMock(...a),
}));
const sendConsentMock = jest.fn();
jest.mock('../services/email', () => ({
  sendWaitlistNotification: jest.fn(),
  sendConsentRequest: (...a: unknown[]) => sendConsentMock(...a),
}));

import { signAdminToken } from '../services/auth';
import { waitlistRouter } from '../routes/waitlist';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(waitlistRouter);
  return app;
}

const authed = () => `Bearer ${signAdminToken()}`;
const entry = {
  id: 3,
  year: 2026,
  camperName: 'Sam Smith',
  parentName: 'Pat Smith',
  parentEmail: 'PAT@Example.com',
  phone: '0821234567',
  grade: '9',
  note: null,
  status: 'waiting',
  deletedAt: null,
};

describe('POST /admin/waitlist/:id/promote', () => {
  beforeEach(() => {
    limitMock.mockReset();
    insertValuesMock.mockReset();
    updateSetMock.mockReset();
    appendMock.mockReset().mockResolvedValue(undefined);
    rowExistsMock.mockReset().mockResolvedValue(false);
    sendConsentMock.mockReset().mockResolvedValue(undefined);
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).post('/admin/waitlist/3/promote');
    expect(res.status).toBe(401);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('creates the camper, appends to the sheet, emails consent, and removes the entry', async () => {
    limitMock.mockResolvedValueOnce([entry]).mockResolvedValueOnce([]); // entry found, no duplicate

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ camperId: 42, alreadyCamper: false, addedToSheet: true, ok: true });

    // Camper created from the split name + carried-over details.
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        firstName: 'Sam',
        lastName: 'Smith',
        grade: '9',
        parentName: 'Pat Smith',
        parentPhone: '0821234567',
        parentEmail: 'pat@example.com',
        source: 'waitlist',
      })
    );

    // Sheet row appended with consent column (index 16) blanked.
    expect(appendMock).toHaveBeenCalledTimes(1);
    const [tab, row] = appendMock.mock.calls[0]!;
    expect(tab).toBe('Registrations');
    expect(row[0]).toBe('Sam');
    expect(row[1]).toBe('Smith');
    expect(row[16]).toBe('');

    // Consent link emailed to the parent.
    const [to, firstName, url] = sendConsentMock.mock.calls[0]!;
    expect(to).toBe('pat@example.com');
    expect(firstName).toBe('Sam');
    expect(url).toMatch(/^http:\/\/localhost:4200\/verify-link\?token=/);

    // Entry soft-deleted + marked placed.
    const setArg = updateSetMock.mock.calls[0]![0] as { status: string; deletedAt: Date };
    expect(setArg.status).toBe('placed');
    expect(setArg.deletedAt).toBeInstanceOf(Date);
  });

  it('reuses an existing camper instead of inserting a duplicate', async () => {
    limitMock.mockResolvedValueOnce([entry]).mockResolvedValueOnce([{ id: 99 }]); // duplicate found

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ camperId: 99, alreadyCamper: true, addedToSheet: true, ok: true });
    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(sendConsentMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT append to the sheet when the camper is already on it', async () => {
    limitMock.mockResolvedValueOnce([entry]).mockResolvedValueOnce([]);
    rowExistsMock.mockResolvedValueOnce(true);

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body.addedToSheet).toBe(false);
    expect(appendMock).not.toHaveBeenCalled();
    // Consent is still requested even when they're already on the sheet.
    expect(sendConsentMock).toHaveBeenCalledTimes(1);
  });

  it('404s when the entry is missing', async () => {
    limitMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());
    expect(res.status).toBe(404);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('leaves the surname blank for a single-word camper name', async () => {
    limitMock.mockResolvedValueOnce([{ ...entry, camperName: 'Cher' }]).mockResolvedValueOnce([]);
    await request(buildApp()).post('/admin/waitlist/3/promote').set('Authorization', authed());
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Cher', lastName: '' })
    );
  });
});
