import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long',
  },
}));

const selectMock = jest.fn();
jest.mock('../db/client', () => ({
  db: { select: () => ({ from: () => ({ where: () => selectMock() }) }) },
}));

const getValuesMock = jest.fn();
jest.mock('../services/sheets', () => ({
  getSheetValues: (...a: unknown[]) => getValuesMock(...a),
}));

import { signAdminToken } from '../services/auth';
import { reconcileRouter } from '../routes/reconcile';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(reconcileRouter);
  return app;
}
const authed = () => `Bearer ${signAdminToken()}`;

function row(over: Partial<Record<number, string | number>>): (string | number)[] {
  const r: (string | number)[] = new Array(24).fill('');
  for (const [k, v] of Object.entries(over)) if (v !== undefined) r[Number(k)] = v;
  return r;
}

describe('GET /admin/reconcile', () => {
  beforeEach(() => {
    selectMock.mockReset();
    getValuesMock.mockReset();
  });

  it('requires an admin token', async () => {
    const res = await request(buildApp()).get('/admin/reconcile');
    expect(res.status).toBe(401);
    expect(getValuesMock).not.toHaveBeenCalled();
  });

  it('returns the three drift buckets for an authed admin', async () => {
    // Sheet has camper id 5 (matches) and a hand-added row with no DB match.
    getValuesMock.mockResolvedValueOnce([
      row({ 0: 'Sam', 1: 'Smith', 11: 'pat@x.com', 17: 5 }),
      row({ 0: 'Hand', 1: 'Added', 11: 'new@x.com' }),
    ]);
    // DB has camper 5 (matches sheet) and camper 9 (missing from the sheet).
    selectMock.mockResolvedValueOnce([
      { id: 5, firstName: 'Sam', lastName: 'Smith', email: null, parentEmail: 'pat@x.com', grade: null, age: null, gender: null, parentName: null, parentPhone: null, dob: null, tshirt: null, church: null },
      { id: 9, firstName: 'Db', lastName: 'Only', email: null, parentEmail: 'db@x.com', grade: '10', age: null, gender: null, parentName: null, parentPhone: null, dob: null, tshirt: null, church: null },
    ]);

    const res = await request(buildApp()).get('/admin/reconcile').set('Authorization', authed());

    expect(res.status).toBe(200);
    expect(res.body.counts).toMatchObject({ sheetRows: 2, dbCampers: 2, matched: 1, sheetOnly: 1, dbOnly: 1, conflicts: 0 });
    expect(res.body.sheetOnly[0]).toMatchObject({ firstName: 'Hand', lastName: 'Added' });
    expect(res.body.dbOnly[0]).toMatchObject({ id: 9 });
    expect(getValuesMock).toHaveBeenCalledWith('Registrations');
  });

  it('500s when the sheet read throws', async () => {
    getValuesMock.mockRejectedValueOnce(new Error('sheet down'));
    selectMock.mockResolvedValueOnce([]);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(buildApp()).get('/admin/reconcile').set('Authorization', authed());
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });
});
