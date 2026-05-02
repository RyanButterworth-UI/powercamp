import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: { CAMP_YEAR: 2026, APPS_SCRIPT_URL: 'https://example.test/exec' },
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
  postToAppsScript: jest.fn(),
}));

import { postToAppsScript } from '../services/sheets';
import { submitRouter } from '../routes/submit';

const mockPost = postToAppsScript as jest.MockedFunction<typeof postToAppsScript>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(submitRouter);
  return app;
}

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  parentEmail: 'parent@example.com',
  friends: ['Alice'],
};

describe('POST /submit', () => {
  beforeEach(() => {
    insertMock.mockResolvedValue([{ id: 42 }]);
    mockPost.mockResolvedValue({ ok: true });
  });

  it('inserts the camper into the DB tagged with CAMP_YEAR and lowercased emails', async () => {
    const res = await request(buildApp())
      .post('/submit')
      .send({ ...validBody, parentEmail: 'PARENT@example.com', email: 'JANE@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42 });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        firstName: 'Jane',
        parentEmail: 'parent@example.com',
        email: 'jane@example.com',
        friends: ['Alice'],
      })
    );
  });

  it('forwards the original payload to Apps Script after the DB insert succeeds', async () => {
    await request(buildApp()).post('/submit').send(validBody);

    expect(insertMock).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining(validBody), 'registration');
  });

  it('still returns 200 with the new id when sheet sync fails (DB is source of truth)', async () => {
    mockPost.mockRejectedValueOnce(new Error('Apps Script returned HTTP 401'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(buildApp()).post('/submit').send(validBody);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42 });
    expect(insertMock).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith(
      'Sheet sync failed (DB write succeeded):',
      expect.any(Error)
    );

    errSpy.mockRestore();
  });

  it('still returns 200 when Apps Script returns HTML instead of JSON (the regression)', async () => {
    mockPost.mockImplementationOnce(async () => {
      throw new SyntaxError(`Unexpected token '<', "<!doctype "... is not valid JSON`);
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(buildApp()).post('/submit').send(validBody);
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 42 });

    errSpy.mockRestore();
  });

  it('rejects payloads missing required fields with 400', async () => {
    const res = await request(buildApp())
      .post('/submit')
      .send({ firstName: 'Jane' });

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns 500 if the DB insert fails (and does not forward to sheet)', async () => {
    insertMock.mockRejectedValueOnce(new Error('db down'));

    const res = await request(buildApp()).post('/submit').send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to register' });
    expect(mockPost).not.toHaveBeenCalled();
  });
});
