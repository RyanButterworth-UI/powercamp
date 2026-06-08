import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const ADMIN_HASH = bcrypt.hashSync('admin-pw', 4);
const EDIT_PW = 'edit-pw';
const EDIT_HASH = bcrypt.hashSync(EDIT_PW, 4);

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    ADMIN_PASSWORD_HASH: ADMIN_HASH,
    EDITOR_PASSWORD_HASH: EDIT_HASH,
    APP_BASE_URL: 'https://example.test',
    GMAIL_USER: 'gmail@example.test',
  },
}));

const selectMock = jest.fn(); // single-row select: .where().limit()
const setSpy = jest.fn();
const updateMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => selectMock() }) }),
    }),
    update: () => ({
      set: (vals: unknown) => {
        setSpy(vals);
        return { where: () => updateMock() };
      },
    }),
  },
}));

const updatedEmailMock = jest.fn();
jest.mock('../services/email', () => ({
  sendRegistrationUpdated: (...args: unknown[]) => updatedEmailMock(...args),
  // Other senders admin.ts / leaders.ts reference at import time.
  sendPaymentConfirmed: jest.fn(),
  renderBlocksToHtml: jest.fn(),
  blocksToPlainText: jest.fn(),
  sendBulkEmail: jest.fn(),
  sendLeaderInvite: jest.fn(),
  sendInviteSentReceipt: jest.fn(),
  sendLeaderRejection: jest.fn(),
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

import { signAdminToken, signEditorToken } from '../services/auth';
import { adminRouter } from '../routes/admin';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

const adminAuth = () => `Bearer ${signAdminToken()}`;
const editorTok = () => signEditorToken();

const EXISTING = {
  id: 7,
  year: 2026,
  firstName: 'Sam',
  lastName: 'Stone',
  dob: '2012-05-01',
  gender: 'Male',
  age: '13',
  grade: '7',
  email: 'sam@example.test',
  camperCell: '0820000000',
  medical: 'None',
  tshirt: 'S',
  church: 'Hope',
  generalInfo: '',
  friends: ['Jo'],
  parentName: 'Pat Stone',
  parentPhone: '0830000000',
  parentEmail: 'pat@example.test',
  consentGeneral: 'yes',
  consentPhoto: 'yes',
  consentDate: '2026-01-01',
  consentAcceptedAt: new Date('2026-01-01'),
  consentEmergencyName: 'Gran',
  consentEmergencyContact: '0840000000',
  consentMedicalAidName: 'Disco',
  consentMedicalAidNumber: '12345',
  deletedAt: null,
};

// A full valid edit body that, by default, matches EXISTING (no changes).
function bodyMatching() {
  return {
    firstName: 'Sam',
    lastName: 'Stone',
    parentEmail: 'pat@example.test',
    dob: '2012-05-01',
    gender: 'Male',
    age: '13',
    grade: '7',
    email: 'sam@example.test',
    camperCell: '0820000000',
    medical: 'None',
    tshirt: 'S',
    church: 'Hope',
    generalInfo: '',
    friends: ['Jo'],
    parentName: 'Pat Stone',
    parentPhone: '0830000000',
    consentEmergencyName: 'Gran',
    consentEmergencyContact: '0840000000',
    consentMedicalAidName: 'Disco',
    consentMedicalAidNumber: '12345',
  };
}

beforeEach(() => {
  selectMock.mockReset();
  setSpy.mockReset();
  updateMock.mockReset();
  updatedEmailMock.mockReset();
  sheetMock.mockReset();
  // These are fired best-effort with .catch(...) — they must return promises.
  updatedEmailMock.mockResolvedValue(undefined);
  sheetMock.mockResolvedValue(undefined);
  updateMock.mockResolvedValue(undefined);
});

describe('POST /admin/editor/unlock', () => {
  it('401 without an admin token', async () => {
    const res = await request(buildApp()).post('/admin/editor/unlock').send({ password: EDIT_PW });
    expect(res.status).toBe(401);
  });

  it('401 on the wrong edit password', async () => {
    const res = await request(buildApp())
      .post('/admin/editor/unlock')
      .set('Authorization', adminAuth())
      .send({ password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('returns an editor JWT on the correct password', async () => {
    const res = await request(buildApp())
      .post('/admin/editor/unlock')
      .set('Authorization', adminAuth())
      .send({ password: EDIT_PW });
    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
  });
});

describe('POST /admin/campers/:id/edit — auth', () => {
  it('401 without an admin token', async () => {
    const res = await request(buildApp()).post('/admin/campers/7/edit').send(bodyMatching());
    expect(res.status).toBe(401);
  });

  it('403 with an admin token but no editor token', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/7/edit')
      .set('Authorization', adminAuth())
      .send(bodyMatching());
    expect(res.status).toBe(403);
  });

  it('403 with a bogus editor token', async () => {
    const res = await request(buildApp())
      .post('/admin/campers/7/edit')
      .set('Authorization', adminAuth())
      .set('X-Editor-Token', 'not.a.token')
      .send(bodyMatching());
    expect(res.status).toBe(403);
  });
});

describe('POST /admin/campers/:id/edit — behaviour', () => {
  const send = (body: object) =>
    request(buildApp())
      .post('/admin/campers/7/edit')
      .set('Authorization', adminAuth())
      .set('X-Editor-Token', editorTok())
      .send(body);

  it('400 on an invalid body (missing firstName)', async () => {
    const { firstName, ...rest } = bodyMatching();
    const res = await send(rest);
    expect(res.status).toBe(400);
  });

  it('404 when the camper does not exist', async () => {
    selectMock.mockResolvedValueOnce([]);
    const res = await send(bodyMatching());
    expect(res.status).toBe(404);
  });

  it('no-ops (no write/sheet/email) when nothing changed', async () => {
    selectMock.mockResolvedValueOnce([EXISTING]);
    const res = await send(bodyMatching());
    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(0);
    expect(setSpy).not.toHaveBeenCalled();
    expect(sheetMock).not.toHaveBeenCalled();
    expect(updatedEmailMock).not.toHaveBeenCalled();
  });

  it('on a real change: writes, returns old→new, syncs sheet, emails the diff', async () => {
    selectMock.mockResolvedValueOnce([EXISTING]);
    updateMock.mockResolvedValueOnce(undefined);
    const res = await send({ ...bodyMatching(), grade: '8', tshirt: 'M' });

    expect(res.status).toBe(200);
    expect(res.body.changed).toBe(2);
    expect(res.body.changes).toEqual(
      expect.arrayContaining([
        { field: 'grade', label: 'Grade', from: '7', to: '8' },
        { field: 'tshirt', label: 'T-shirt size', from: 'S', to: 'M' },
      ])
    );

    // DB write happened, and the consent record was NOT in the update payload.
    expect(setSpy).toHaveBeenCalledTimes(1);
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(written.grade).toBe('8');
    expect(written).not.toHaveProperty('consentGeneral');
    expect(written).not.toHaveProperty('consentPhoto');
    expect(written).not.toHaveProperty('consentDate');
    expect(written).not.toHaveProperty('consentAcceptedAt');

    // Sheet synced + email sent with the change list.
    expect(sheetMock).toHaveBeenCalledTimes(1);
    expect(updatedEmailMock).toHaveBeenCalledTimes(1);
    const emailArgs = updatedEmailMock.mock.calls[0];
    expect(emailArgs[0]).toBe('pat@example.test'); // to parent
    expect(emailArgs[3]).toEqual(res.body.changes); // changes passed through
  });

  it('lowercases parent + camper email and detects them as changes', async () => {
    selectMock.mockResolvedValueOnce([EXISTING]);
    updateMock.mockResolvedValueOnce(undefined);
    const res = await send({
      ...bodyMatching(),
      parentEmail: 'NEWPARENT@Example.test',
      email: 'NEWSAM@Example.test',
    });
    expect(res.status).toBe(200);
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(written.parentEmail).toBe('newparent@example.test');
    expect(written.email).toBe('newsam@example.test');
  });
});
