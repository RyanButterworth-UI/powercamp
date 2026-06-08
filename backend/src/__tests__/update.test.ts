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
const insertMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => selectMock() }) }) }),
    update: () => ({
      set: () => ({
        where: () => ({ returning: () => updateMock() }),
      }),
    }),
    insert: () => ({
      values: () => ({ returning: () => insertMock() }),
    }),
  },
}));

const sheetMock = jest.fn();
jest.mock('../services/sheets', () => ({
  upsertToSheet: (...args: unknown[]) => sheetMock(...args),
}));

const emailMock = jest.fn();
const updatedEmailMock = jest.fn();
jest.mock('../services/email', () => ({
  sendRegistrationReceived: (...args: unknown[]) => emailMock(...args),
  sendRegistrationUpdated: (...args: unknown[]) => updatedEmailMock(...args),
}));

import { signMagicToken } from '../services/auth';
import { updateRouter } from '../routes/update';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(updateRouter);
  return app;
}

const validBody = (token: string) => ({
  token,
  camper: {
    firstName: 'Ryan',
    lastName: 'Butterworth',
    parentEmail: 'PARENT@example.com',
    email: 'CAMPER@example.com',
    camperCell: '0820000001',
    gender: 'Male',
    age: '16',
    grade: '11',
    friends: ['Alice'],
    medical: '',
    parentName: 'Mum',
    parentPhone: '0827654321',
    church: 'Test',
    tshirt: 'M',
    generalInfo: '',
    dob: '2009-01-01',
  },
  consent: {
    general: 'accept',
    location: 'accept',
    risk: 'accept',
    powerCamp: 'accept',
    behaviour: 'accept',
    photo: 'accept',
    emergencyName: 'Test Contact',
    emergencyContact: '0820000099',
    medicalAidName: 'NONE',
    medicalAidNumber: 'NONE',
    date: '2026-05-02',
  },
});

describe('POST /update', () => {
  beforeEach(() => {
    selectMock.mockReset();
    updateMock.mockReset();
    insertMock.mockReset();
    sheetMock.mockReset().mockResolvedValue(undefined);
    emailMock.mockReset().mockResolvedValue(undefined);
    updatedEmailMock.mockReset().mockResolvedValue(undefined);
  });

  it('rejects missing/short tokens with 400', async () => {
    const res = await request(buildApp()).post('/update').send({ camper: {}, consent: {} });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid magic token with 401', async () => {
    const res = await request(buildApp()).post('/update').send(validBody('not-a-real-token-string'));
    expect(res.status).toBe(401);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('UPDATEs the camper the link was issued for when it is a current-year row, NOT "first by parent email" (sibling-safe)', async () => {
    // The token is for camper 7; it resolves to a current-year row, so we
    // update exactly that row and never run the parent-email fallback query.
    selectMock.mockResolvedValueOnce([{ id: 7, year: 2026, deletedAt: null }]);
    updateMock.mockResolvedValueOnce([{ id: 7 }]);

    const token = signMagicToken(7);
    const res = await request(buildApp()).post('/update').send(validBody(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(7);
    // Already a current-year row → a true edit.
    expect(res.body.action).toBe('updated');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
    // Only the linked lookup ran — no "first row by parent email" fallback.
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('updates the linked row in place even when it is a prior-year record (carried forward, never a new row)', async () => {
    // A returning family clicks a prior-year sign-in link. We update THAT row
    // (re-tagged to the current year via the payload) — we never insert a
    // second row or hunt by parent email. One link → one row → edited.
    selectMock.mockResolvedValueOnce([{ id: 5, year: 2025, deletedAt: null }]);
    updateMock.mockResolvedValueOnce([{ id: 5 }]);

    const token = signMagicToken(5);
    const res = await request(buildApp()).post('/update').send(validBody(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(5);
    // Prior-year row carried forward into the current year → a registration.
    expect(res.body.action).toBe('registered');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
    // Exactly one lookup — the linked row by id. No parent-email fallback.
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('returns 404 (and NEVER inserts) when the magic link points at a row that no longer exists', async () => {
    selectMock.mockResolvedValueOnce([]); // linked id resolves to nothing

    const token = signMagicToken(123);
    const res = await request(buildApp()).post('/update').send(validBody(token));

    expect(res.status).toBe(404);
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the linked row is soft-deleted (never resurrects or inserts)', async () => {
    selectMock.mockResolvedValueOnce([{ id: 5, deletedAt: new Date() }]);

    const token = signMagicToken(5);
    const res = await request(buildApp()).post('/update').send(validBody(token));

    expect(res.status).toBe(404);
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('UPSERTs the Registrations row (id-primary key) so an edit updates in place, not appends a duplicate', async () => {
    selectMock.mockResolvedValue([{ id: 1, deletedAt: null }]); // linked row exists
    updateMock.mockResolvedValueOnce([{ id: 1 }]);

    const token = signMagicToken(1);
    await request(buildApp()).post('/update').send(validBody(token));
    await new Promise((resolve) => setImmediate(resolve));

    expect(sheetMock).toHaveBeenCalledTimes(1);
    const [tab, row, keyCols, fallbackCols] = sheetMock.mock.calls[0]!;
    expect(tab).toBe('Registrations');
    expect(row).toHaveLength(24);
    expect(row[0]).toBe('Ryan');
    expect(row[1]).toBe('Butterworth');
    expect(row[4]).toBe('camper@example.com');
    expect(row[11]).toBe('parent@example.com');
    // Col Q is index 16: 'TRUE' once consent is accepted.
    expect(row[16]).toBe('TRUE');
    // Col R is index 17: the camper's stable DB id (here id 1).
    expect(row[17]).toBe(1);
    // New columns: emergency contact, medical aid, consent date, year.
    expect(row[18]).toBe('Test Contact');   // S emergency name
    expect(row[19]).toBe('0820000099');      // T emergency number
    expect(row[22]).toBe('2026-05-02');      // W consent date
    expect(row[23]).toBe(2026);              // X year
    // Primary key is the id column (R / 17); fallback is the A/B/L composite.
    expect(keyCols).toEqual([17]);
    expect(fallbackCols).toEqual([0, 1, 11]);
  });

  it('editing a CURRENT-year registration sends the "details updated" email, NOT the received one', async () => {
    selectMock.mockResolvedValue([{ id: 1, year: 2026, deletedAt: null }]); // current year → edit
    updateMock.mockResolvedValueOnce([{ id: 1 }]);

    const token = signMagicToken(1);
    await request(buildApp()).post('/update').send(validBody(token));
    await new Promise((resolve) => setImmediate(resolve));

    expect(updatedEmailMock).toHaveBeenCalledWith('parent@example.com', 'Ryan', 'camper@example.com');
    expect(emailMock).not.toHaveBeenCalled();
  });

  it('carrying a PRIOR-year row forward sends the "registration received" email', async () => {
    selectMock.mockResolvedValue([{ id: 1, year: 2025, deletedAt: null }]); // prior year → register
    updateMock.mockResolvedValueOnce([{ id: 1 }]);

    const token = signMagicToken(1);
    await request(buildApp()).post('/update').send(validBody(token));
    await new Promise((resolve) => setImmediate(resolve));

    expect(emailMock).toHaveBeenCalledWith('parent@example.com', 'Ryan', 'camper@example.com');
    expect(updatedEmailMock).not.toHaveBeenCalled();
  });

  it('still returns 200 if sheet sync or email fails (DB is source of truth)', async () => {
    selectMock.mockResolvedValue([{ id: 1, deletedAt: null }]);
    updateMock.mockResolvedValueOnce([{ id: 1 }]);
    sheetMock.mockRejectedValueOnce(new Error('sheets down'));
    emailMock.mockRejectedValueOnce(new Error('SMTP down'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const token = signMagicToken(7);
    const res = await request(buildApp()).post('/update').send(validBody(token));
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    errSpy.mockRestore();
  });

  it('returns 500 when the DB write fails', async () => {
    selectMock.mockRejectedValueOnce(new Error('db down'));
    const token = signMagicToken(7);
    const res = await request(buildApp()).post('/update').send(validBody(token));
    expect(res.status).toBe(500);
  });

  it('rejects when any consent field is missing', async () => {
    const token = signMagicToken(7);
    const body = validBody(token);
    (body.consent as Record<string, string>).photo = '';

    const res = await request(buildApp()).post('/update').send(body);
    expect(res.status).toBe(400);
  });
});
