import 'dotenv/config';
import { z } from 'zod';

// Exported for tests. The actual env-validate-and-exit dance below uses
// the same schema. Anything that wants to assert on the schema's behaviour
// (e.g. "APP_BASE_URL can't be localhost in prod") imports this directly.
export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CAMP_YEAR: z
    .string()
    .default('2026')
    .transform((s) => Number.parseInt(s, 10))
    .pipe(z.number().int().gte(2024).lte(2100)),
  GOOGLE_SHEET_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((s) => s.replace(/\\n/g, '\n')),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  LEADER_PASSWORD_HASH: z.string().min(1),
  // Bcrypt hash of Neil's second-factor password for approve/reject. Generated
  // the same way as ADMIN_PASSWORD_HASH (`npm run hash:admin-password -- '<pw>'`).
  // The previous hardcoded literal in admin.ts has been removed and must be
  // considered burned — rotate to a fresh password before deploying.
  NEIL_PASSWORD_HASH: z.string().min(1),
  GMAIL_USER: z.string().email(),
  GMAIL_APP_PASSWORD: z.string().min(1),
  FROM_NAME: z.string().default('Power Camp'),
  // The public URL emails embed. Default is local-dev only; in production
  // (NODE_ENV=production) we refuse to fall back to localhost — otherwise
  // a missing Render env var silently emails leader invites and magic
  // links pointing at http://localhost:4200, which is what just happened
  // to Nadia. Render sets NODE_ENV=production automatically on web
  // services, so this fails fast at boot instead of in a recipient's inbox.
  APP_BASE_URL: z
    .string()
    .url()
    .default('http://localhost:4200')
    .refine(
      (url) =>
        process.env.NODE_ENV !== 'production' ||
        (!url.includes('localhost') && !url.includes('127.0.0.1')),
      'APP_BASE_URL must be a public URL in production (e.g. https://powercamplife.co.za). Set it in the Render dashboard.'
    ),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:4200,https://powercamp-registration.onrender.com')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  // Where leader-application notifications and invite-sent receipts are
  // delivered. Falls back to GMAIL_USER (the sender mailbox) if not set,
  // so a fresh deploy without NEIL_EMAIL still routes notifications to a
  // real inbox the camp owns rather than dropping them.
  NEIL_EMAIL: z.string().email().optional(),
  PORT: z
    .string()
    .default('3000')
    .transform((s) => Number.parseInt(s, 10))
    .pipe(z.number().int().positive()),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
