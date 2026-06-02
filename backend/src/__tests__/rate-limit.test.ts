import express, { Express } from 'express';
import request from 'supertest';
import { createRateLimiter, RateLimitOptions } from '../middleware/rate-limit';

// Pin every request to one bucket key so tests don't depend on the client IP
// supertest happens to present.
const FIXED_KEY: Pick<RateLimitOptions, 'keyGenerator'> = { keyGenerator: () => 'test-key' };

function buildApp(opts: RateLimitOptions): Express {
  const app = express();
  app.use(express.json());
  app.use(createRateLimiter(opts));
  app.post('/thing', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/login', (req, res) => {
    const ok = req.body?.password === 'right';
    res.status(ok ? 200 : 401).json({ ok });
  });
  return app;
}

// Let any res.on('finish') handlers (used by skipSuccessfulRequests) run
// before the next request in the same test.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('createRateLimiter', () => {
  it('allows requests up to the limit, then responds 429', async () => {
    const app = buildApp({ windowMs: 60_000, limit: 3, ...FIXED_KEY });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/thing').send({});
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post('/thing').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many requests, please try again later.' });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('uses the custom message in the 429 body', async () => {
    const app = buildApp({ windowMs: 60_000, limit: 1, message: 'Slow down!', ...FIXED_KEY });
    await request(app).post('/thing').send({});
    const blocked = await request(app).post('/thing').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Slow down!' });
  });

  it('starts a fresh window once the previous one expires', async () => {
    const app = buildApp({ windowMs: 40, limit: 1, ...FIXED_KEY });

    expect((await request(app).post('/thing').send({})).status).toBe(200);
    expect((await request(app).post('/thing').send({})).status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, 60)); // window elapses

    expect((await request(app).post('/thing').send({})).status).toBe(200);
  });

  it('only counts failed responses when skipSuccessfulRequests is set', async () => {
    const app = buildApp({
      windowMs: 60_000,
      limit: 2,
      skipSuccessfulRequests: true,
      ...FIXED_KEY,
    });

    // Successful logins are rolled back and never accumulate.
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/login').send({ password: 'right' });
      expect(res.status).toBe(200);
      await flush();
    }

    // Failed logins count: two are allowed, the third is blocked.
    expect((await request(app).post('/login').send({ password: 'wrong' })).status).toBe(401);
    await flush();
    expect((await request(app).post('/login').send({ password: 'wrong' })).status).toBe(401);
    await flush();
    expect((await request(app).post('/login').send({ password: 'wrong' })).status).toBe(429);
  });

  it('bypasses limiting entirely when skip returns true', async () => {
    const app = buildApp({ windowMs: 60_000, limit: 1, skip: () => true, ...FIXED_KEY });
    for (let i = 0; i < 5; i++) {
      expect((await request(app).post('/thing').send({})).status).toBe(200);
    }
  });

  it('tracks separate keys independently', async () => {
    const app = express();
    app.use(express.json());
    let n = 0;
    app.use(createRateLimiter({ windowMs: 60_000, limit: 1, keyGenerator: () => `key-${n}` }));
    app.post('/thing', (_req, res) => {
      res.json({ ok: true });
    });

    n = 1;
    expect((await request(app).post('/thing').send({})).status).toBe(200);
    n = 2; // different key — its own fresh allowance
    expect((await request(app).post('/thing').send({})).status).toBe(200);
    n = 1; // back to the first key — already used up
    expect((await request(app).post('/thing').send({})).status).toBe(429);
  });
});
