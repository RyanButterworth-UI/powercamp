import type { Request, Response, NextFunction, RequestHandler } from 'express';

// A small, dependency-free fixed-window rate limiter.
//
// Why hand-rolled rather than `express-rate-limit`? The app runs as a single
// Render web service, so an in-process counter is sufficient and adds no
// dependency or build weight. If this ever scales to multiple instances, swap
// the in-memory Map for a shared store (Redis) or drop in `express-rate-limit`
// with a `rate-limit-redis` store — the call sites in server.ts stay the same.
//
// Keyed by client IP (set `app.set('trust proxy', 1)` so req.ip reflects the
// real client behind Render's proxy, not the proxy itself).

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Length of the rolling window in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key per window before 429s start. */
  limit: number;
  /**
   * When true, responses with status < 400 are not counted against the cap.
   * Used on the login endpoint so a legitimate admin signing in repeatedly is
   * never locked out — only failed attempts (wrong password) accumulate.
   */
  skipSuccessfulRequests?: boolean;
  /** Per-request opt-out. Returning true bypasses the limiter entirely. */
  skip?: (req: Request) => boolean;
  /** Derives the bucket key. Defaults to the client IP. */
  keyGenerator?: (req: Request) => string;
  /** Body of the 429 JSON response: `{ error: message }`. */
  message?: string;
}

export type RateLimiter = RequestHandler & { reset: () => void };

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const {
    windowMs,
    limit,
    skipSuccessfulRequests = false,
    skip,
    keyGenerator = (req) => req.ip ?? 'unknown',
    message = 'Too many requests, please try again later.',
  } = options;

  const buckets = new Map<string, Bucket>();

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    if (skip?.(req)) {
      next();
      return;
    }

    const now = Date.now();
    const key = keyGenerator(req);
    let bucket = buckets.get(key);

    // Start a fresh window if there's no bucket yet or the old one has expired.
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: message });
      return;
    }

    bucket.count += 1;

    // Roll the increment back once the response is known to be a success, so
    // successful requests don't count toward the cap when configured.
    if (skipSuccessfulRequests) {
      const counted = bucket;
      res.on('finish', () => {
        if (res.statusCode < 400 && counted.count > 0) counted.count -= 1;
      });
    }

    next();
  };

  (middleware as RateLimiter).reset = () => buckets.clear();
  return middleware as RateLimiter;
}

// Jest sets NODE_ENV='test', which disables the shared limiters below so the
// existing supertest suites (which fire many requests at one router) are
// unaffected. The limiter itself is covered directly in rate-limit.test.ts.
const limitingDisabled = process.env.NODE_ENV === 'test';

// Strict: brute-force protection for the admin password endpoint. Only failed
// logins count, so the real admin is never locked out by signing in normally.
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  skip: () => limitingDisabled,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
});

// Moderate: spam protection for the public endpoints that write to the DB and
// trigger emails (registration, waiting list, leader applications, sign-in
// links). Generous enough for a real family filling in forms, low enough to
// stop a script blasting the inbox or the database.
export const publicFormRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  skip: () => limitingDisabled,
  message: 'Too many requests from this device. Please wait a little while and try again.',
});
