import { Router } from 'express';
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { appendToSheet } from '../services/sheets';
import { registrationSheetRow } from '../lib/registration-sheet';
import { sendRegistrationReceived } from '../services/email';
import { ensureSubscription } from '../services/subscriptions';
import { getRegistrationsOpen } from '../services/settings';

const optionalString = z.string().optional().nullable().transform((v) => v ?? undefined);

// Some fields (age, grade, phone numbers, dob) come from radio buttons or
// Excel imports that may bind numbers. Coerce to string so the FE doesn't
// have to babysit every input — leniency at the boundary, not the core.
const lenientOptionalString = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v) => (v === null || v === undefined ? undefined : String(v)));

const camperBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  parentEmail: z.string().email(),
  dob: lenientOptionalString,
  gender: optionalString,
  age: lenientOptionalString,
  grade: lenientOptionalString,
  email: optionalString,
  camperCell: lenientOptionalString,
  medical: optionalString,
  tshirt: optionalString,
  church: optionalString,
  generalInfo: optionalString,
  friends: z.array(z.string()).optional(),
  parentName: optionalString,
  parentPhone: lenientOptionalString,
});

const consentBody = z.object({
  general: z.string().min(1),
  location: z.string().min(1),
  risk: z.string().min(1),
  powerCamp: z.string().min(1),
  behaviour: z.string().min(1),
  photo: z.string().min(1),
  emergencyName: z.string().min(1),
  emergencyContact: z.string().min(1),
  medicalAidName: z.string().min(1),
  medicalAidNumber: z.string().min(1),
  date: z.string().min(1),
});

const submitBody = z.object({
  camper: camperBody,
  consent: consentBody,
});

export const submitRouter = Router();

submitRouter.post('/submit', async (req, res) => {
  // Block NEW registrations when the admin has closed registrations. Editing
  // an existing registration (POST /update) is intentionally unaffected, so
  // families who already have a spot can still update their details.
  if (!(await getRegistrationsOpen())) {
    return res.status(403).json({ error: 'Registrations are closed' });
  }

  const parsed = submitBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration', details: parsed.error.flatten() });
  }

  const { camper: c, consent } = parsed.data;
  const acceptedAt = new Date();
  const camperEmail = c.email?.toLowerCase();
  const parentEmail = c.parentEmail.toLowerCase();
  console.log('Received registration:', c);

  try {
    // Duplicate guard. A magic-link edit (POST /update) is the only intended
    // way to change an existing registration. A second POST /submit for the
    // same child is almost always an accidental resubmit — a stale browser
    // draft restored into the form, a double-tap, or a back-button replay.
    // Reject it rather than insert a duplicate row, and never overwrite, so a
    // fresh edit can't be clobbered by an older draft. Siblings are
    // unaffected: they share a parent email (our implicit family key) but
    // have a different name, so this name-scoped lookup misses them.
    const [duplicate] = await db
      .select({ id: campers.id })
      .from(campers)
      .where(
        and(
          eq(campers.year, env.CAMP_YEAR),
          eq(campers.parentEmail, parentEmail),
          sql`lower(${campers.firstName}) = ${c.firstName.trim().toLowerCase()}`,
          sql`lower(${campers.lastName}) = ${c.lastName.trim().toLowerCase()}`,
          isNull(campers.deletedAt)
        )
      )
      .limit(1);

    if (duplicate) {
      return res.status(409).json({
        error: 'already-registered',
        message:
          `${c.firstName} is already registered for Power Camp ${env.CAMP_YEAR}. ` +
          `To change any details, use the edit link from your confirmation email — ` +
          `or search your name on the home page and we'll send you a fresh one.`,
        id: duplicate.id,
      });
    }

    const [row] = await db
      .insert(campers)
      .values({
        year: env.CAMP_YEAR,
        // Store trimmed so the duplicate guard above (which compares
        // trimmed/lowercased names) can reliably match a re-submission.
        firstName: c.firstName.trim(),
        lastName: c.lastName.trim(),
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
        parentPhone: c.parentPhone,
        parentEmail,
        source: 'web',
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
        consentAcceptedAt: acceptedAt,
      })
      .returning({ id: campers.id });

    // Full row via the shared builder so /submit and /update can never drift
    // apart. Col R carries the stable camper id (the edit upsert key); the
    // emergency-contact, medical-aid and consent-date columns mean the sheet
    // holds the complete record, not just the headline fields.
    appendToSheet(
      'Registrations',
      registrationSheetRow(
        { ...c, parentEmail, email: camperEmail },
        consent,
        row.id,
        env.CAMP_YEAR
      )
    ).catch((err) => {
      console.error('Sheet sync failed (DB write succeeded):', err);
    });

    sendRegistrationReceived(parentEmail, c.firstName, camperEmail).catch((err) => {
      console.error('Registration-received email failed:', err);
    });

    // Auto-subscribe parent + camper emails to bulk announcements (idempotent).
    ensureSubscription(parentEmail, 'registration').catch((err) =>
      console.error('Subscription upsert failed (parent):', err)
    );
    if (camperEmail) {
      ensureSubscription(camperEmail, 'registration').catch((err) =>
        console.error('Subscription upsert failed (camper):', err)
      );
    }

    res.json({ id: row.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register' });
  }
});
