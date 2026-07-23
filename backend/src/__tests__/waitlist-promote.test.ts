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

// Flexible db mock: select().from().where().limit() drains a queue so the
// handlers' successive selects can return different results; insert/update
// capture their payloads.
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
const sendReceivedMock = jest.fn();
jest.mock('../services/email', () => ({
  sendWaitlistNotification: jest.fn(),
  sendWaitlistConfirmation: jest.fn(),
  sendConsentRequest: (...a: unknown[]) => sendConsentMock(...a),
  sendRegistrationReceived: (...a: unknown[]) => sendReceivedMock(...a),
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

// A legacy MINIMAL entry: only camperName + parent details, no consent.
const minimalEntry = {
  id: 3,
  year: 2026,
  camperName: 'Sam Smith',
  firstName: null,
  lastName: null,
  parentName: 'Pat Smith',
  parentEmail: 'PAT@Example.com',
  phone: '0821234567',
  grade: '9',
  friends: [],
  consentAcceptedAt: null,
  status: 'waiting',
  deletedAt: null,
};

// A full entry with consent captured at join.
const fullEntry = {
  ...minimalEntry,
  firstName: 'Sam',
  lastName: 'Smith',
  consentAcceptedAt: new Date(),
  consentGeneral: 'accept',
  consentEmergencyName: 'Pat Smith',
};

describe('POST /admin/waitlist/:id/promote', () => {
  beforeEach(() => {
    limitMock.mockReset();
    insertValuesMock.mockReset();
    updateSetMock.mockReset();
    appendMock.mockReset().mockResolvedValue(undefined);
    rowExistsMock.mockReset().mockResolvedValue(false);
    sendConsentMock.mockReset().mockResolvedValue(undefined);
    sendReceivedMock.mockReset().mockResolvedValue(undefined);
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).post('/admin/waitlist/3/promote');
    expect(res.status).toBe(401);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('legacy entry (no consent): creates camper, blanks sheet consent, sends the consent request', async () => {
    limitMock.mockResolvedValueOnce([minimalEntry]).mockResolvedValueOnce([]); // entry, no duplicate

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      camperId: 42,
      alreadyCamper: false,
      addedToSheet: true,
      consentCaptured: false,
      ok: true,
    });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Sam', lastName: 'Smith', source: 'waitlist' })
    );
    const [, row] = appendMock.mock.calls[0]!;
    expect(row[16]).toBe(''); // consent column blanked
    expect(sendConsentMock).toHaveBeenCalledTimes(1);
    expect(sendReceivedMock).not.toHaveBeenCalled();
  });

  it('full entry (consent on file): copies consent, keeps sheet consent TRUE, sends a confirmation', async () => {
    limitMock.mockResolvedValueOnce([fullEntry]).mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ consentCaptured: true, addedToSheet: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ consentGeneral: 'accept', consentAcceptedAt: fullEntry.consentAcceptedAt })
    );
    const [, row] = appendMock.mock.calls[0]!;
    expect(row[16]).toBe('TRUE'); // consent column kept
    expect(sendReceivedMock).toHaveBeenCalledTimes(1);
    expect(sendConsentMock).not.toHaveBeenCalled();
  });

  it('reuses an existing camper instead of inserting a duplicate', async () => {
    limitMock.mockResolvedValueOnce([minimalEntry]).mockResolvedValueOnce([{ id: 99 }]);

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.body).toMatchObject({ camperId: 99, alreadyCamper: true });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('does NOT append to the sheet when the camper is already on it', async () => {
    limitMock.mockResolvedValueOnce([minimalEntry]).mockResolvedValueOnce([]);
    rowExistsMock.mockResolvedValueOnce(true);

    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());

    expect(res.body.addedToSheet).toBe(false);
    expect(appendMock).not.toHaveBeenCalled();
  });

  it('404s when the entry is missing', async () => {
    limitMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/admin/waitlist/3/promote')
      .set('Authorization', authed());
    expect(res.status).toBe(404);
  });
});

describe('POST /admin/campers/:id/demote', () => {
  const camper = {
    id: 5,
    year: 2026,
    firstName: 'Sam',
    lastName: 'Smith',
    parentEmail: 'pat@x.com',
    parentPhone: '082',
    grade: '9',
    friends: [],
    consentAcceptedAt: new Date(),
    consentGeneral: 'accept',
    deletedAt: null,
  };

  beforeEach(() => {
    limitMock.mockReset();
    insertValuesMock.mockReset();
    updateSetMock.mockReset();
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).post('/admin/campers/5/demote');
    expect(res.status).toBe(401);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('copies the full camper (incl. consent) to the waitlist and soft-deletes the camper', async () => {
    limitMock.mockResolvedValueOnce([camper]);

    const res = await request(buildApp())
      .post('/admin/campers/5/demote')
      .set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ waitlistId: 42, ok: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        camperName: 'Sam Smith',
        firstName: 'Sam',
        status: 'waiting',
        consentGeneral: 'accept',
        consentAcceptedAt: camper.consentAcceptedAt,
      })
    );
    const setArg = updateSetMock.mock.calls[0]![0] as { deletedAt: Date };
    expect(setArg.deletedAt).toBeInstanceOf(Date);
  });

  it('404s when the camper is missing', async () => {
    limitMock.mockResolvedValueOnce([]);
    const res = await request(buildApp())
      .post('/admin/campers/5/demote')
      .set('Authorization', authed());
    expect(res.status).toBe(404);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });
});
