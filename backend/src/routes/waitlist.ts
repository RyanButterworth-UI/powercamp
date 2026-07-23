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
import {
  sendWaitlistNotification,
  sendWaitlistConfirmation,
  sendConsentRequest,
  sendRegistrationReceived,
} from '../services/email';
import { camperBody, consentBody } from './submit';

// The waiting-list join is now the FULL registration flow: the same camper
// shape as /submit, plus an OPTIONAL consent block. Consent is optional here
// (not on /submit) so a family can still get onto the list quickly — if it's
// missing, promote falls back to emailing a consent request.
const waitlistBody = z.object({
  camper: camperBody,
  consent: consentBody.optional(),
  note: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v == null || v.trim() === '' ? undefined : v.trim())),
});

export const waitlistRouter = Router();

// Public: a family joins the waiting list. Captures the full registration
// (details + consent) so nothing has to be chased later, stores it, emails the
// FAMILY a clear "you're on the waiting list — not a confirmed place" note, and
// (best-effort) pings the admin mailbox + mirrors a summary into the Waitlist
// sheet tab. Nothing is written to the Registrations sheet / Mailchimp — that
// only happens if an admin promotes them.
waitlistRouter.post('/waitlist', async (req, res) => {
  const parsed = waitlistBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid waiting-list request', details: parsed.error.flatten() });
  }

  const { camper: c, consent, note } = parsed.data;
  const parentEmail = c.parentEmail.toLowerCase();
  const camperEmail = c.email?.toLowerCase();
  const firstName = c.firstName.trim();
  const lastName = c.lastName.trim();
  const camperName = `${firstName} ${lastName}`.trim();

  try {
    const [row] = await db
      .insert(waitlist)
      .values({
        year: env.CAMP_YEAR,
        camperName,
        firstName,
        lastName,
        dob: c.dob,
        gender: c.gender,
        age: c.age,
        grade: c.grade,
        email: camperEmail,
        camperCell: c.camperCell,
        medical: c.medical,
        tshirt: c.tshirt,
        church: c.church,
        generalInfo: c.generalInfo,
        friends: c.friends ?? [],
        parentName: c.parentName,
        parentEmail,
        phone: c.parentPhone,
        note,
        // Consent block is only stamped when the family actually completed it.
        ...(consent
          ? {
              consentGeneral: consent.general,
              consentLocation: consent.location,
              consentRisk: consent.risk,
              consentPowerCamp: consent.powerCamp,
              consentBehaviour: consent.behaviour,
              consentPhoto: consent.photo,
              consentEmergencyName: consent.emergencyName,
              consentEmergencyContact: consent.emergencyContact,
              consentMedicalAidName: consent.medicalAidName,
              consentMedicalAidNumber: consent.medicalAidNumber,
              consentDate: consent.date,
              consentAcceptedAt: new Date(),
            }
          : {}),
      })
      .returning({ id: waitlist.id });

    // Family confirmation — the wording makes clear this is NOT a confirmed spot.
    sendWaitlistConfirmation(parentEmail, firstName, camperEmail).catch((err) =>
      console.error('Waitlist confirmation email failed:', err)
    );

    // Admin heads-up (unchanged).
    sendWaitlistNotification(env.REGISTRATION_ADMIN_EMAIL, {
      camperName,
      parentName: c.parentName,
      parentEmail,
      phone: c.parentPhone,
      grade: c.grade,
      note,
    }).catch((err) => console.error('Waitlist notification email failed:', err));

    // Summary mirror into the Waitlist sheet tab (unchanged columns).
    appendToSheet('Waitlist', [
      new Date().toISOString(),
      camperName,
      c.parentName ?? '',
      parentEmail,
      c.parentPhone ?? '',
      c.grade ?? '',
      note ?? '',
    ]).catch((err) => console.error('Waitlist sheet sync failed (DB write succeeded):', err));

    res.json({ id: row.id, ok: true, consentCaptured: !!consent });
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

// Admin: move a waiting-list entry onto the main camper list. Copies the full
// record — including consent when it was captured at join — into a camper row
// (or reuses an existing one for the same family + name + year, so a double-tap
// can't duplicate), then:
//   • appends to the Registrations sheet if not already there (the Apps Script
//     watches that tab for Mailchimp — we must not double-add);
//   • if consent is already on file, emails a registration confirmation;
//     otherwise emails the 12-hour consent request (re-triggerable);
//   • removes the entry from the waiting list.
// Sheet + email are best-effort — the camper row is the source of truth.
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

    // Prefer the structured names captured by the full flow; fall back to
    // splitting the legacy free-text camperName for old minimal entries.
    const nameParts = entry.camperName.trim().split(/\s+/);
    const firstName = (entry.firstName ?? '').trim() || nameParts[0] || entry.camperName.trim();
    const lastName = (entry.lastName ?? '').trim() || nameParts.slice(1).join(' ');
    const parentEmail = entry.parentEmail.toLowerCase();
    const hasConsent = !!entry.consentAcceptedAt;

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
          dob: entry.dob,
          gender: entry.gender,
          age: entry.age,
          grade: entry.grade,
          email: entry.email,
          camperCell: entry.camperCell,
          medical: entry.medical,
          tshirt: entry.tshirt,
          church: entry.church,
          generalInfo: entry.generalInfo,
          friends: entry.friends ?? [],
          parentName: entry.parentName,
          parentPhone: entry.phone,
          parentEmail,
          source: 'waitlist',
          consentGeneral: entry.consentGeneral,
          consentLocation: entry.consentLocation,
          consentRisk: entry.consentRisk,
          consentPowerCamp: entry.consentPowerCamp,
          consentBehaviour: entry.consentBehaviour,
          consentPhoto: entry.consentPhoto,
          consentEmergencyName: entry.consentEmergencyName,
          consentEmergencyContact: entry.consentEmergencyContact,
          consentMedicalAidName: entry.consentMedicalAidName,
          consentMedicalAidNumber: entry.consentMedicalAidNumber,
          consentDate: entry.consentDate,
          consentAcceptedAt: entry.consentAcceptedAt,
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
            camperCell: entry.camperCell ?? undefined,
            gender: entry.gender ?? undefined,
            email: entry.email ?? undefined,
            age: entry.age ?? undefined,
            grade: entry.grade ?? undefined,
            friends: entry.friends ?? undefined,
            medical: entry.medical ?? undefined,
            parentName: entry.parentName ?? undefined,
            parentPhone: entry.phone ?? undefined,
            parentEmail,
            church: entry.church ?? undefined,
            tshirt: entry.tshirt ?? undefined,
            generalInfo: entry.generalInfo ?? undefined,
            dob: entry.dob ?? undefined,
          },
          {
            emergencyName: entry.consentEmergencyName ?? undefined,
            emergencyContact: entry.consentEmergencyContact ?? undefined,
            medicalAidName: entry.consentMedicalAidName ?? undefined,
            medicalAidNumber: entry.consentMedicalAidNumber ?? undefined,
            date: entry.consentDate ?? undefined,
          },
          camperId,
          env.CAMP_YEAR
        );
        if (!hasConsent) row[16] = ''; // col Q — consent not captured yet
        await appendToSheet('Registrations', row);
        addedToSheet = true;
      }
    } catch (err) {
      console.error('Promote sheet sync failed (DB write succeeded):', err);
    }

    // Consent on file → a registration confirmation. Otherwise the consent
    // auto-email (kept deliberately; the family/admin can re-trigger it).
    if (hasConsent) {
      sendRegistrationReceived(parentEmail, firstName, entry.email).catch((err) =>
        console.error('Promote confirmation email failed:', err)
      );
    } else {
      const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/verify-link?token=${encodeURIComponent(
        signConsentLinkToken(camperId)
      )}`;
      sendConsentRequest(parentEmail, firstName, url).catch((err) =>
        console.error('Consent-request email failed (promote):', err)
      );
    }

    // Remove from the waiting list. Stamp status too, so a peek at the raw row
    // shows why it was removed.
    await db
      .update(waitlist)
      .set({ status: 'placed', deletedAt: new Date() })
      .where(eq(waitlist.id, id));

    console.warn(
      `[promote] waitlist ${entry.id} — ${entry.camperName} → camper ${camperId}` +
        (hasConsent ? ' (consent on file)' : ' (consent requested)')
    );
    res.json({ camperId, alreadyCamper, addedToSheet, consentCaptured: hasConsent, ok: true });
  } catch (err) {
    console.error('waitlist promote error:', err);
    res.status(500).json({ error: 'Failed to move the entry to the main list' });
  }
});

// Admin: move a camper BACK to the waiting list — the inverse of promote. Copies
// the FULL camper record (including consent) onto the waiting list so a later
// re-promote loses nothing, then soft-deletes the camper (it leaves the
// dashboard/exports immediately). We deliberately DON'T touch the Registrations
// sheet: finding the right row is fragile while columns are being hand-edited,
// and Mailchimp can't be auto-unsubscribed anyway — tidy the sheet by hand.
waitlistRouter.post('/admin/campers/:id/demote', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid camper id' });
  }

  try {
    const [camper] = await db
      .select()
      .from(campers)
      .where(and(eq(campers.id, id), isNull(campers.deletedAt)))
      .limit(1);
    if (!camper) return res.status(404).json({ error: 'Camper not found' });

    const camperName = `${camper.firstName} ${camper.lastName}`.trim();
    const [row] = await db
      .insert(waitlist)
      .values({
        year: camper.year,
        camperName,
        firstName: camper.firstName,
        lastName: camper.lastName,
        dob: camper.dob,
        gender: camper.gender,
        age: camper.age,
        grade: camper.grade,
        email: camper.email,
        camperCell: camper.camperCell,
        medical: camper.medical,
        tshirt: camper.tshirt,
        church: camper.church,
        generalInfo: camper.generalInfo,
        friends: camper.friends ?? [],
        parentName: camper.parentName,
        parentEmail: camper.parentEmail,
        phone: camper.parentPhone,
        consentGeneral: camper.consentGeneral,
        consentLocation: camper.consentLocation,
        consentRisk: camper.consentRisk,
        consentPowerCamp: camper.consentPowerCamp,
        consentBehaviour: camper.consentBehaviour,
        consentPhoto: camper.consentPhoto,
        consentEmergencyName: camper.consentEmergencyName,
        consentEmergencyContact: camper.consentEmergencyContact,
        consentMedicalAidName: camper.consentMedicalAidName,
        consentMedicalAidNumber: camper.consentMedicalAidNumber,
        consentDate: camper.consentDate,
        consentAcceptedAt: camper.consentAcceptedAt,
        status: 'waiting',
      })
      .returning({ id: waitlist.id });

    await db
      .update(campers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(campers.id, id));

    console.warn(`[demote] camper ${camper.id} — ${camperName} → waitlist ${row.id}`);
    res.json({ waitlistId: row.id, ok: true });
  } catch (err) {
    console.error('camper demote error:', err);
    res.status(500).json({ error: 'Failed to move the camper back to the waiting list' });
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
