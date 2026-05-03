import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { leaders } from '../db/schema';
import { env } from '../env';
import { appendToSheet } from '../services/sheets';
import { ensureSubscription } from '../services/subscriptions';

// Leaders sheet tab column order:
// A firstName, B lastName, C cell, D gender, E email, F age, G grade,
// H church, I tshirt, J parentName, K parentPhone, L parentEmail,
// M applicationNotes, N status, O approvedByNeil, P createdAt.
function leaderRow(d: {
  firstName: string;
  lastName: string;
  cell?: string;
  gender?: string;
  email: string;
  age?: string;
  grade?: string;
  church?: string;
  tshirt?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  applicationNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedByNeil: boolean;
}): (string | number | null)[] {
  return [
    d.firstName,
    d.lastName,
    d.cell ?? '',
    d.gender ?? '',
    d.email,
    d.age ?? '',
    d.grade ?? '',
    d.church ?? '',
    d.tshirt ?? '',
    d.parentName ?? '',
    d.parentPhone ?? '',
    d.parentEmail ?? '',
    d.applicationNotes ?? '',
    d.status,
    d.approvedByNeil ? 'TRUE' : 'FALSE',
    new Date().toISOString(),
  ];
}

export { leaderRow };

const checkPasswordBody = z.object({
  password: z.string().min(1).max(200),
});

const applyBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  cell: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  grade: z.string().optional(),
  church: z.string().optional(),
  tshirt: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().optional(),
  applicationNotes: z.string().optional(),
});

export const leadersRouter = Router();

leadersRouter.post('/leaders/check-password', async (req, res) => {
  const parsed = checkPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const ok = await bcrypt.compare(parsed.data.password, env.LEADER_PASSWORD_HASH);
  if (!ok) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.json({ ok: true });
});

leadersRouter.post('/leaders/apply', async (req, res) => {
  const parsed = applyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid application', details: parsed.error.flatten() });
  }
  const data = parsed.data;
  try {
    const [row] = await db
      .insert(leaders)
      .values({
        year: env.CAMP_YEAR,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        cell: data.cell,
        gender: data.gender,
        age: data.age,
        grade: data.grade,
        church: data.church,
        tshirt: data.tshirt,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail?.toLowerCase(),
        applicationNotes: data.applicationNotes,
        status: 'pending',
        approvedByNeil: false,
      })
      .returning({ id: leaders.id });

    appendToSheet(
      'Leaders',
      leaderRow({ ...data, email: data.email.toLowerCase(), status: 'pending', approvedByNeil: false })
    ).catch((err) => {
      console.error('Leader sheet sync failed (DB write succeeded):', err);
    });

    ensureSubscription(data.email.toLowerCase(), 'leader-application').catch((err) =>
      console.error('Subscription upsert failed (leader):', err)
    );

    res.json({ id: row.id });
  } catch (err) {
    console.error('leaders/apply error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});
