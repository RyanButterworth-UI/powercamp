import express from 'express';
import request from 'supertest';

jest.mock('../env', () => ({
  env: {
    CAMP_YEAR: 2026,
    NEIL_EMAIL: 'neil.cable@wol.co.za',
    GMAIL_USER: 'send@example.com',
  },
}));

import { publicConfigRouter } from '../routes/public-config';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(publicConfigRouter);
  return app;
}

describe('GET /public-config', () => {
  it('returns the env-driven Neil application email + camp year', async () => {
    const res = await request(buildApp()).get('/public-config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      leaderApplicationEmail: 'neil.cable@wol.co.za',
      campYear: 2026,
    });
  });

  it('is unauthenticated — no admin token required', async () => {
    // The endpoint must be reachable before login since it drives the
    // public /leader-apply page. Asserting explicitly here so a future
    // refactor that wraps it in requireAdmin (or similar) breaks the
    // test instead of silently breaking the apply flow.
    const res = await request(buildApp()).get('/public-config');
    expect(res.status).not.toBe(401);
  });
});

describe('GET /public-config — fallback when NEIL_EMAIL is unset', () => {
  // Override the env mock for this describe block. Jest module mocks are
  // hoisted to the top of the file, so re-mocking + reimporting is the
  // cleanest way to test a different env shape.
  beforeAll(() => {
    jest.resetModules();
    jest.doMock('../env', () => ({
      env: {
        CAMP_YEAR: 2026,
        NEIL_EMAIL: undefined,
        GMAIL_USER: 'fallback@example.com',
      },
    }));
  });

  it('falls back to GMAIL_USER when NEIL_EMAIL is unset', async () => {
    const { publicConfigRouter: freshRouter } = await import('../routes/public-config');
    const app = express();
    app.use(express.json());
    app.use(freshRouter);
    const res = await request(app).get('/public-config');
    expect(res.status).toBe(200);
    expect(res.body.leaderApplicationEmail).toBe('fallback@example.com');
  });
});
