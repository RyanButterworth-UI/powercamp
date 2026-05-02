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
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:4200,https://powercamp-registration.onrender.com')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
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
