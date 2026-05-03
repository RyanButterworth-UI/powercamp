import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: { CAMP_YEAR: 2026 },
}));

const insertMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    insert: () => ({
      values: (vals: unknown) => ({
        returning: () => insertMock(vals),
      }),
    }),
  },
}));

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
}));

jest.mock('../services/email', () => ({
  sendRegistrationReceived: jest.fn(),
}));

import { appendToSheet } from '../services/sheets';
import { sendRegistrationReceived } from '../services/email';
import { submitRouter } from '../routes/submit';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;
const mockEmail = sendRegistrationReceived as jest.MockedFunction<typeof sendRegistrationReceived>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(submitRouter);
  return app;
}

const validBody = {
  camper: {
    firstName: 'Jane',
    lastName: 'Doe',
    parentEmail: 'parent@example.com',
    email: 'jane@example.com',
    camperCell: '0821234567',
    gender: 'F',
    age: '14',
    grade: '9',
    friends: ['Alice', 'Bob'],
    medical: '',
    parentName: 'Mum',
    parentPhone: '0827654321',
    church: 'Hope',
    tshirt: 'M',
    generalInfo: '',
    dob: '2010-01-01',
  },
  consent: {
    general: 'accept',
    location: 'accept',
    risk: 'accept',
    powerCamp: 'accept',
    behaviour: 'accept',
    photo: 'accept',
    emergencyName: 'Emergency Contact',
    emergencyContact: '0820000099',
    medicalAidName: 'NONE',
    medicalAidNumber: 'NONE',
    date: '2026-05-02',
  },
};

describe('POST /submit', () => {
  beforeEach(() => {
    insertMock.mockResolvedValue([{ id: 42 }]);
    mockAppend.mockResolvedValue(undefined);
    mockEmail.mockResolvedValue(undefined);
  });

  it('inserts the camper into the DB tagged with CAMP_YEAR and lowercased emails', async () => {
    const res = await request(buildApp()).post('/submit').send({
      camper: { ...validBody.camper, parentEmail: 'PARENT@example.com', email: 'JANE@example.com' },
      consent: validBody.consent,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42 });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        firstName: 'Jane',
        parentEmail: 'parent@example.com',
        email: 'jane@example.com',
        friends: ['Alice', 'Bob'],
        consentGeneral: 'accept',
        consentEmergencyName: 'Emergency Contact',
      })
    );
  });

  it('appends a 17-column row to Registrations with Q=TRUE since consent is mandatory', async () => {
    await request(buildApp()).post('/submit').send(validBody);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockAppend).toHaveBeenCalledWith('Registrations', [
      'Jane',                // A firstName
      'Doe',                 // B lastName
      '0821234567',          // C camperCell
      'F',                   // D gender
      'jane@example.com',    // E email
      '14',                  // F age
      '9',                   // G grade
      'Alice, Bob',          // H friends
      '',                    // I medical
      'Mum',                 // J parentName
      '0827654321',          // K parentPhone
      'parent@example.com',  // L parentEmail
      'Hope',                // M church
      'M',                   // N tshirt
      '',                    // O generalInfo
      '2010-01-01',          // P dob
      'TRUE',                // Q Consent Accepted — gated by ConsentStep
    ]);
  });

  it('sends the registration-received email to the parent and CCs the camper email when present', async () => {
    await request(buildApp()).post('/submit').send(validBody);
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockEmail).toHaveBeenCalledWith('parent@example.com', 'Jane', 'jane@example.com');
  });

  it('rejects bodies missing the consent block with 400', async () => {
    const res = await request(buildApp())
      .post('/submit')
      .send({ camper: validBody.camper });

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it('rejects bodies missing required camper fields with 400', async () => {
    const res = await request(buildApp())
      .post('/submit')
      .send({ camper: { firstName: 'Jane' }, consent: validBody.consent });

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects bodies missing required consent fields with 400', async () => {
    const res = await request(buildApp())
      .post('/submit')
      .send({ camper: validBody.camper, consent: { ...validBody.consent, photo: '' } });

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns 500 if the DB insert fails (and does not append to sheet)', async () => {
    insertMock.mockRejectedValueOnce(new Error('db down'));

    const res = await request(buildApp()).post('/submit').send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to register' });
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it('still returns 200 with the new id when sheet or email fails (DB is source of truth)', async () => {
    mockAppend.mockRejectedValueOnce(new Error('sheets api 503'));
    mockEmail.mockRejectedValueOnce(new Error('SMTP down'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(buildApp()).post('/submit').send(validBody);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42 });
    errSpy.mockRestore();
  });
});
