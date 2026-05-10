import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
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
  GMAIL_USER: z.string().email(),
  GMAIL_APP_PASSWORD: z.string().min(1),
  FROM_NAME: z.string().default('Power Camp'),
  APP_BASE_URL: z.string().url().default('http://localhost:4200'),
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

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
