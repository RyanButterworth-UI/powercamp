import { Router } from 'express';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { waitlist } from '../db/schema';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { appendToSheet } from '../services/sheets';
import { sendWaitlistNotification } from '../services/email';

const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v == null || v.trim() === '' ? undefined : v.trim()));

const waitlistBody = z.object({
  camperName: z.string().min(1).max(200),
  parentName: optionalString,
  parentEmail: z.string().email(),
  phone: optionalString,
  grade: optionalString,
  note: z.string().max(2000).optional().nullable().transform((v) => v ?? undefined),
});

export const waitlistRouter = Router();

// Public: a family joins the waiting list from the closed-registrations
// screen. Persists the row, then (best-effort) notifies the admin mailbox
// and mirrors the entry into a Waitlist sheet tab.
waitlistRouter.post('/waitlist', async (req, res) => {
  const parsed = waitlistBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid waiting-list request', details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const parentEmail = d.parentEmail.toLowerCase();

  try {
    const [row] = await db
      .insert(waitlist)
      .values({
        year: env.CAMP_YEAR,
        camperName: d.camperName,
        parentName: d.parentName,
        parentEmail,
        phone: d.phone,
        grade: d.grade,
        note: d.note,
      })
      .returning({ id: waitlist.id });

    sendWaitlistNotification(env.REGISTRATION_ADMIN_EMAIL, {
      camperName: d.camperName,
      parentName: d.parentName,
      parentEmail,
      phone: d.phone,
      grade: d.grade,
      note: d.note,
    }).catch((err) => console.error('Waitlist notification email failed:', err));

    appendToSheet('Waitlist', [
      new Date().toISOString(),
      d.camperName,
      d.parentName ?? '',
      parentEmail,
      d.phone ?? '',
      d.grade ?? '',
      d.note ?? '',
    ]).catch((err) => console.error('Waitlist sheet sync failed (DB write succeeded):', err));

    res.json({ id: row.id, ok: true });
  } catch (err) {
    console.error('waitlist error:', err);
    res.status(500).json({ error: 'Failed to join the waiting list' });
  }
});

// Admin: list the current year's waiting list, newest first.
waitlistRouter.get('/admin/waitlist', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.year, env.CAMP_YEAR))
      .orderBy(desc(waitlist.createdAt));
    res.json({ total: rows.length, waitlist: rows });
  } catch (err) {
    console.error('admin/waitlist error:', err);
    res.status(500).json({ error: 'Failed to load waiting list' });
  }
});
