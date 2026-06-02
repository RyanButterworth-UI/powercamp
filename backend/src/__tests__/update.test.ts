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
  appendToSheet: (...args: unknown[]) => sheetMock(...args),
}));

const emailMock = jest.fn();
jest.mock('../services/email', () => ({
  sendRegistrationReceived: (...args: unknown[]) => emailMock(...args),
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
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
    // Only the linked lookup ran — no "first row by parent email" fallback.
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the current-year row for the parent when the link points at a prior-year record (re-registration)', async () => {
    selectMock
      .mockResolvedValueOnce([{ id: 5, year: 2025, deletedAt: null }]) // linked row is last year's
      .mockResolvedValueOnce([{ id: 99 }]); // family already has a current-year row
    updateMock.mockResolvedValueOnce([{ id: 99 }]);

    const token = signMagicToken(5);
    const res = await request(buildApp()).post('/update').send(validBody(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(99);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledTimes(2);
  });

  it('INSERTs a fresh current-year row when the link is prior-year and the family has none yet', async () => {
    selectMock
      .mockResolvedValueOnce([{ id: 5, year: 2025, deletedAt: null }]) // prior-year link
      .mockResolvedValueOnce([]); // no current-year row for this parent
    insertMock.mockResolvedValueOnce([{ id: 200 }]);

    const token = signMagicToken(5);
    const res = await request(buildApp()).post('/update').send(validBody(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('appends to the Registrations sheet with the consent timestamp in column Q', async () => {
    selectMock.mockResolvedValue([]); // no linked row, no current-year row → insert
    insertMock.mockResolvedValueOnce([{ id: 1 }]);

    const token = signMagicToken(7);
    await request(buildApp()).post('/update').send(validBody(token));
    await new Promise((resolve) => setImmediate(resolve));

    expect(sheetMock).toHaveBeenCalledTimes(1);
    const [tab, row] = sheetMock.mock.calls[0]!;
    expect(tab).toBe('Registrations');
    expect(row).toHaveLength(17);
    expect(row[0]).toBe('Ryan');
    expect(row[1]).toBe('Butterworth');
    expect(row[4]).toBe('camper@example.com');
    expect(row[11]).toBe('parent@example.com');
    // Col Q is index 16: 'TRUE' once consent is accepted.
    expect(row[16]).toBe('TRUE');
  });

  it('sends the registration-received email to the parent_email (lowercased)', async () => {
    selectMock.mockResolvedValue([]);
    insertMock.mockResolvedValueOnce([{ id: 1 }]);

    const token = signMagicToken(7);
    await request(buildApp()).post('/update').send(validBody(token));
    await new Promise((resolve) => setImmediate(resolve));

    expect(emailMock).toHaveBeenCalledWith('parent@example.com', 'Ryan');
  });

  it('still returns 200 if sheet sync or email fails (DB is source of truth)', async () => {
    selectMock.mockResolvedValue([]);
    insertMock.mockResolvedValueOnce([{ id: 1 }]);
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
