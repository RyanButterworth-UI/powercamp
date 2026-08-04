import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
  },
}));

const insertMock = jest.fn();
const whereMock = jest.fn();
const orderByMock = jest.fn();

jest.mock('../db/client', () => ({
  db: {
    insert: () => ({
      values: (vals: unknown) => ({
        onConflictDoNothing: () => ({ returning: () => insertMock(vals) }),
      }),
    }),
    // where() is both awaitable (the roster lookup in matchCamperId ends
    // there) and chainable into orderBy() (the two admin queries do). The
    // thenable is lazy so awaiting is what triggers whereMock.
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => orderByMock(),
          then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(whereMock()).then(resolve, reject),
        }),
      }),
    }),
  },
}));

jest.mock('../services/sheets', () => ({
  appendToSheet: jest.fn(),
}));

import { appendToSheet } from '../services/sheets';
import { signAdminToken } from '../services/auth';
import { feedbackRouter, nameKey } from '../routes/feedback';

const mockAppend = appendToSheet as jest.MockedFunction<typeof appendToSheet>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(feedbackRouter);
  return app;
}

const answers = {
  camperName: 'Timothy Cable',
  campOrganization: '5',
  spiritualInput: '5',
  activities: '4',
  facilities: '4',
  userComment: 'Loved the devotions',
  oneWord: 'Organised',
  requiresFeedback: 'No',
  additionalInfo: '',
};

describe('nameKey', () => {
  it('collapses case, spacing, punctuation and accents to one key', () => {
    expect(nameKey('Timothy  Cable')).toBe('timothy cable');
    expect(nameKey('  timothy CABLE ')).toBe('timothy cable');
    expect(nameKey('Tímothy Cable!')).toBe('timothy cable');
    expect(nameKey("Alexa J v'Rensburg")).toBe('alexa j v rensburg');
  });
});

describe('POST /feedback', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue([{ id: 11 }]);
    whereMock.mockReset().mockResolvedValue([]);
    orderByMock.mockReset().mockResolvedValue([]);
    mockAppend.mockReset().mockResolvedValue(undefined);
  });

  it('stores the response against the camp year with a normalised name key', async () => {
    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 11, camperId: null });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        camperName: 'Timothy Cable',
        nameKey: 'timothy cable',
        campOrganization: 5,
        spiritualInput: 5,
        activities: 4,
        facilities: 4,
        userComment: 'Loved the devotions',
        oneWord: 'Organised',
        requiresFollowUp: false,
        // '' on the form becomes NULL in the column.
        additionalInfo: null,
      })
    );
  });

  it('rejects a second response for the same camper with 409', async () => {
    // onConflictDoNothing returns no row when the unique (year, nameKey)
    // index rejects the insert.
    insertMock.mockResolvedValueOnce([]);

    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'already_submitted',
      camperName: 'Timothy Cable',
    });
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it('links the camper when the typed name matches exactly one on the register', async () => {
    whereMock.mockResolvedValue([
      { id: 42, firstName: 'Timothy', lastName: 'Cable' },
      { id: 43, firstName: 'Emma', lastName: 'Cable' },
    ]);

    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(200);
    expect(res.body.camperId).toBe(42);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ camperId: 42 })
    );
  });

  it('matches on first name alone when it is unique this year', async () => {
    whereMock.mockResolvedValue([
      { id: 42, firstName: 'Timothy', lastName: 'Cable' },
      { id: 43, firstName: 'Emma', lastName: 'Cable' },
    ]);

    const res = await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Timothy' });

    expect(res.body.camperId).toBe(42);
  });

  it('leaves the camper unlinked for an ambiguous or joint entry', async () => {
    whereMock.mockResolvedValue([
      { id: 42, firstName: 'Abigail', lastName: 'Calitz' },
      { id: 43, firstName: 'Joshua', lastName: 'Calitz' },
    ]);

    const res = await request(buildApp())
      .post('/feedback')
      .send({ ...answers, camperName: 'Abigail and Joshua Calitz' });

    expect(res.status).toBe(200);
    expect(res.body.camperId).toBeNull();
  });

  it('mirrors to the Feedback tab in a fixed column order', async () => {
    await request(buildApp()).post('/feedback').send(answers);

    expect(mockAppend).toHaveBeenCalledWith('Feedback', [
      expect.any(String), // timestamp
      'Timothy Cable',
      5,
      5,
      4,
      4,
      'Loved the devotions',
      'Organised',
      'No',
      '',
    ]);
  });

  it('still succeeds when the sheet append fails — the row is saved', async () => {
    mockAppend.mockRejectedValueOnce(new Error('sheets down'));

    const res = await request(buildApp()).post('/feedback').send(answers);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 500 when the insert fails', async () => {
    insertMock.mockRejectedValueOnce(new Error('boom'));
    const res = await request(buildApp()).post('/feedback').send(answers);
    expect(res.status).toBe(500);
  });

  it('rejects a submission with no name or an out-of-range rating', async () => {
    const app = buildApp();

    expect((await request(app).post('/feedback').send({})).status).toBe(400);
    expect(
      (await request(app).post('/feedback').send({ ...answers, camperName: ' ' }))
        .status
    ).toBe(400);
    expect(
      (await request(app).post('/feedback').send({ ...answers, activities: '9' }))
        .status
    ).toBe(400);
  });

  it('records a follow-up request', async () => {
    await request(buildApp())
      .post('/feedback')
      .send({ ...answers, requiresFeedback: 'Yes' });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ requiresFollowUp: true })
    );
  });
});

describe('GET /admin/feedback', () => {
  const rows = [
    {
      id: 1,
      camperId: 42,
      camperName: 'Timothy Cable',
      campOrganization: 5,
      spiritualInput: 5,
      activities: 4,
      facilities: 4,
      requiresFollowUp: false,
    },
    {
      id: 2,
      camperId: null,
      camperName: 'Amelie and Louise',
      campOrganization: 4,
      spiritualInput: 3,
      activities: 4,
      facilities: 2,
      requiresFollowUp: true,
    },
  ];

  beforeEach(() => {
    orderByMock
      .mockReset()
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([
        { id: 42, firstName: 'Timothy', lastName: 'Cable' },
        { id: 43, firstName: 'Emma', lastName: 'Cable' },
      ]);
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).get('/admin/feedback');
    expect(res.status).toBe(401);
  });

  it('returns the responses with category averages and a chase list', async () => {
    const res = await request(buildApp())
      .get('/admin/feedback')
      .set('Authorization', `Bearer ${signAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.summary).toEqual(
      expect.objectContaining({
        campOrganization: 4.5,
        spiritualInput: 4,
        activities: 4,
        facilities: 3,
        followUpRequested: 1,
        registeredCampers: 2,
        // Timothy's response is linked, Emma's isn't — so only Emma is
        // still to chase.
        awaiting: [{ id: 43, name: 'Emma Cable' }],
      })
    );
  });
});
