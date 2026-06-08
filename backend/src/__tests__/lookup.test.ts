import express from 'express';
import request from 'supertest';

const queryMock = jest.fn();
jest.mock('../db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => queryMock(),
          }),
        }),
      }),
    }),
  },
}));

import { lookupRouter, maskEmail } from '../routes/lookup';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(lookupRouter);
  return app;
}

describe('POST /lookup', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('returns campers tagged kind:camper with masked parent emails', async () => {
    queryMock
      .mockResolvedValueOnce([
        { id: 7, firstName: 'Emma', lastName: 'Cable', year: 2025, email: 'jill.cable@me.com' },
      ]) // campers
      .mockResolvedValueOnce([]); // leaders

    const res = await request(buildApp()).post('/lookup').send({ q: 'emma' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      results: [
        {
          id: 7,
          firstName: 'Emma',
          lastName: 'Cable',
          year: 2025,
          kind: 'camper',
          parentEmailMasked: 'ji***@me.com',
        },
      ],
    });
  });

  it('includes returning leaders, tagged kind:leader, with their own email masked', async () => {
    queryMock
      .mockResolvedValueOnce([]) // campers
      .mockResolvedValueOnce([
        { id: 3, firstName: 'Sam', lastName: 'Lead', year: 2025, email: 'sam@leader.com' },
      ]); // leaders

    const res = await request(buildApp()).post('/lookup').send({ q: 'sam' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { id: 3, firstName: 'Sam', lastName: 'Lead', year: 2025, kind: 'leader', parentEmailMasked: 'sa***@leader.com' },
    ]);
  });

  it('sorts the combined camper + leader results by year desc then name', async () => {
    queryMock
      .mockResolvedValueOnce([{ id: 1, firstName: 'Zara', lastName: 'Young', year: 2026, email: 'z@x.com' }]) // campers
      .mockResolvedValueOnce([{ id: 2, firstName: 'Amy', lastName: 'Allen', year: 2025, email: 'a@y.com' }]); // leaders

    const res = await request(buildApp()).post('/lookup').send({ q: 'a' });

    expect(res.body.results.map((r: { firstName: string; kind: string }) => `${r.firstName}:${r.kind}`)).toEqual([
      'Zara:camper',
      'Amy:leader',
    ]);
  });

  it('returns an empty results array when nothing matches', async () => {
    queryMock.mockResolvedValue([]); // both camper + leader selects return empty

    const res = await request(buildApp()).post('/lookup').send({ q: 'zzz' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ results: [] });
  });

  it('rejects an empty or whitespace-only query with 400', async () => {
    const res = await request(buildApp()).post('/lookup').send({ q: '   ' });
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a missing query body with 400', async () => {
    const res = await request(buildApp()).post('/lookup').send({});
    expect(res.status).toBe(400);
  });

  it('returns 500 when the DB query throws', async () => {
    queryMock.mockRejectedValueOnce(new Error('db down'));
    const res = await request(buildApp()).post('/lookup').send({ q: 'emma' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Lookup failed' });
  });
});

describe('maskEmail', () => {
  it('masks a normal email keeping first two characters of the local part', () => {
    expect(maskEmail('jill.cable@me.com')).toBe('ji***@me.com');
  });

  it('masks a single-character local part to its only character', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });

  it('returns empty string for null/undefined', () => {
    expect(maskEmail(null)).toBe('');
    expect(maskEmail(undefined)).toBe('');
  });

  it('returns *** for malformed emails', () => {
    expect(maskEmail('not-an-email')).toBe('***');
  });
});
