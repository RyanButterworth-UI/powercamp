import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { campers, waitlist } from '../db/schema';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { requireDeletePassword } from '../middleware/require-delete-password';
import { deletePasswordRateLimiter } from '../middleware/rate-limit';
import { appendToSheet, registrationRowExists } from '../services/sheets';
import { registrationSheetRow } from '../lib/registration-sheet';
import { signConsentLinkToken } from '../services/auth';
import { sendWaitlistNotification, sendConsentRequest } from '../services/email';

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
      .where(and(eq(waitlist.year, env.CAMP_YEAR), isNull(waitlist.deletedAt)))
      .orderBy(desc(waitlist.createdAt));
    res.json({ total: rows.length, waitlist: rows });
  } catch (err) {
    console.error('admin/waitlist error:', err);
    res.status(500).json({ error: 'Failed to load waiting list' });
  }
});

// Admin: move a waiting-list entry onto the main camper list. This is the flow
// for a family who joined the waiting list while registrations were closed and
// now has a spot. It:
//   1. creates a camper row from the entry's details (or reuses an existing one
//      for the same family + name + year, so a double-click can't duplicate);
//   2. appends them to the Registrations sheet ONLY if they're not already on it
//      (the Apps Script watches that tab and pushes new rows to Mailchimp — we
//      must not double-add). Consent is left blank; it flips to TRUE when the
//      parent completes the consent flow below;
//   3. emails the parent a 12-hour consent link (the same edit/consent form);
//   4. removes the entry from the waiting list.
// Steps 2 and 3 are best-effort — the camper row (step 1) is the source of truth
// and having been created, the move has succeeded.
waitlistRouter.post('/admin/waitlist/:id/promote', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid waiting-list id' });
  }

  try {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(and(eq(waitlist.id, id), isNull(waitlist.deletedAt)))
      .limit(1);
    if (!entry) return res.status(404).json({ error: 'Waiting-list entry not found' });

    // The waiting list stores one free-text camperName; campers need a first +
    // last name. First token is the first name, the remainder the surname; a
    // single-word name leaves the surname blank for the admin to fill in later.
    const nameParts = entry.camperName.trim().split(/\s+/);
    const firstName = nameParts[0] || entry.camperName.trim();
    const lastName = nameParts.slice(1).join(' ');
    const parentEmail = entry.parentEmail.toLowerCase();

    // Duplicate guard — reuse an existing non-deleted camper for this family +
    // name + year rather than inserting a second row (mirrors POST /submit).
    const [existing] = await db
      .select({ id: campers.id })
      .from(campers)
      .where(
        and(
          eq(campers.year, env.CAMP_YEAR),
          eq(campers.parentEmail, parentEmail),
          sql`lower(${campers.firstName}) = ${firstName.toLowerCase()}`,
          sql`lower(${campers.lastName}) = ${lastName.toLowerCase()}`,
          isNull(campers.deletedAt)
        )
      )
      .limit(1);

    const alreadyCamper = !!existing;
    let camperId: number;
    if (existing) {
      camperId = existing.id;
    } else {
      const [row] = await db
        .insert(campers)
        .values({
          year: env.CAMP_YEAR,
          firstName,
          lastName,
          grade: entry.grade,
          parentName: entry.parentName,
          parentPhone: entry.phone,
          parentEmail,
          source: 'waitlist',
        })
        .returning({ id: campers.id });
      camperId = row.id;
    }

    // Append to the Registrations sheet only if they're not already on it.
    let addedToSheet = false;
    try {
      if (!(await registrationRowExists(firstName, lastName, parentEmail))) {
        const row = registrationSheetRow(
          {
            firstName,
            lastName,
            grade: entry.grade ?? undefined,
            parentName: entry.parentName ?? undefined,
            parentPhone: entry.phone ?? undefined,
            parentEmail,
          },
          {},
          camperId,
          env.CAMP_YEAR
        );
        row[16] = ''; // col Q — consent not given yet (registrationSheetRow hardcodes 'TRUE')
        await appendToSheet('Registrations', row);
        addedToSheet = true;
      }
    } catch (err) {
      console.error('Promote sheet sync failed (DB write succeeded):', err);
    }

    // Trigger the consent flow — 12-hour link to the edit/consent form.
    const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/verify-link?token=${encodeURIComponent(
      signConsentLinkToken(camperId)
    )}`;
    sendConsentRequest(parentEmail, firstName, url).catch((err) =>
      console.error('Consent-request email failed (promote):', err)
    );

    // Remove from the waiting list. Stamp status too, so a peek at the raw row
    // shows why it was removed.
    await db
      .update(waitlist)
      .set({ status: 'placed', deletedAt: new Date() })
      .where(eq(waitlist.id, id));

    console.warn(`[promote] waitlist ${entry.id} — ${entry.camperName} → camper ${camperId}`);
    res.json({ camperId, alreadyCamper, addedToSheet, ok: true });
  } catch (err) {
    console.error('waitlist promote error:', err);
    res.status(500).json({ error: 'Failed to move the entry to the main list' });
  }
});

// Admin: soft-delete a waiting-list entry. Same two gates and same semantics as
// the camper and leader deletes in routes/admin.ts — see the note there.
waitlistRouter.post(
  '/admin/waitlist/:id/delete',
  requireAdmin,
  deletePasswordRateLimiter,
  requireDeletePassword,
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid waiting-list id' });
    }
    try {
      const [row] = await db
        .update(waitlist)
        .set({ deletedAt: new Date() })
        .where(and(eq(waitlist.id, id), isNull(waitlist.deletedAt)))
        .returning({ id: waitlist.id, camperName: waitlist.camperName });
      if (!row) return res.status(404).json({ error: 'Waiting-list entry not found' });

      console.warn(`[delete] waitlist ${row.id} — ${row.camperName}`);
      res.json({ id: row.id, deleted: true });
    } catch (err) {
      console.error('waitlist delete error:', err);
      res.status(500).json({ error: 'Failed to delete the waiting-list entry' });
    }
  }
);
