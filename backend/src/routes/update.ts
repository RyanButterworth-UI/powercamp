import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { verifyMagicToken } from '../services/auth';
import { upsertToSheet } from '../services/sheets';
import {
  registrationSheetRow,
  REGISTRATION_SHEET_KEY,
  REGISTRATION_SHEET_FALLBACK_KEY,
} from '../lib/registration-sheet';
import { sendRegistrationReceived } from '../services/email';
import { ensureSubscription } from '../services/subscriptions';

const optionalString = z.string().optional().nullable().transform((v) => v ?? undefined);

const lenientOptionalString = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v) => (v === null || v === undefined ? undefined : String(v)));

const updateBody = z.object({
  token: z.string().min(10),
  camper: z.object({
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
  }),
  consent: z.object({
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
  }),
});

export const updateRouter = Router();

updateRouter.post('/update', async (req, res) => {
  const parsed = updateBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const claims = verifyMagicToken(parsed.data.token);
  if (!claims) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }

  const { camper: c, consent: consentForm } = parsed.data;
  const acceptedAt = new Date();
  const camperEmail = c.email?.toLowerCase();
  const parentEmail = c.parentEmail.toLowerCase();

  const camperPayload = {
    year: env.CAMP_YEAR,
    firstName: c.firstName,
    lastName: c.lastName,
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
    consentGeneral: consentForm.general,
    consentLocation: consentForm.location,
    consentRisk: consentForm.risk,
    consentPowerCamp: consentForm.powerCamp,
    consentBehaviour: consentForm.behaviour,
    consentPhoto: consentForm.photo,
    consentEmergencyName: consentForm.emergencyName,
    consentEmergencyContact: consentForm.emergencyContact,
    consentMedicalAidName: consentForm.medicalAidName,
    consentMedicalAidNumber: consentForm.medicalAidNumber,
    consentDate: consentForm.date,
    consentAcceptedAt: acceptedAt,
    updatedAt: acceptedAt,
  };

  let camperId: number;
  // 'updated' = the row was already a current-year registration (a true edit);
  // 'registered' = a returning family carried a prior-year row forward into the
  // current year. Drives the "Successfully edited" vs "Registered" wording on
  // the confirmation screen.
  let action: 'updated' | 'registered';
  try {
    // An edit must only ever EDIT. The magic link identifies one specific
    // camper row (claims.camperId); update exactly that row and nothing else.
    // We deliberately do NOT fall back to "find by parent email" (which would
    // clobber a sibling) or to inserting a new row (which silently created
    // duplicate registrations + a spurious "registration received" email when
    // a stale link pointed at a since-removed id). If the link no longer
    // resolves, say so and let them request a fresh one. The payload re-tags
    // the row to the current camp year, so a returning family editing a
    // prior-year link is carried forward in place — still no new row.
    const [linked] = await db
      .select({ id: campers.id, year: campers.year, deletedAt: campers.deletedAt })
      .from(campers)
      .where(eq(campers.id, claims.camperId))
      .limit(1);

    if (!linked || linked.deletedAt) {
      return res
        .status(404)
        .json({ error: 'Registration not found — please request a new sign-in link.' });
    }

    action = linked.year === env.CAMP_YEAR ? 'updated' : 'registered';

    const [updated] = await db
      .update(campers)
      .set(camperPayload)
      .where(eq(campers.id, linked.id))
      .returning({ id: campers.id });
    camperId = updated.id;
  } catch (err) {
    console.error('update DB error:', err);
    return res.status(500).json({ error: 'Failed to save registration' });
  }

  // Sheet upsert (best-effort) via the shared builder — same layout as /submit,
  // so an edit overwrites the exact same columns. Keyed PRIMARILY on the stable
  // camper id (col R / index 17) so changing a name or email can't orphan the
  // row; falls back to the firstName+lastName+parentEmail composite for rows
  // written before the id column existed, and to append if neither matches.
  upsertToSheet(
    'Registrations',
    registrationSheetRow(
      { ...c, parentEmail, email: camperEmail },
      consentForm,
      camperId,
      env.CAMP_YEAR
    ),
    REGISTRATION_SHEET_KEY,
    REGISTRATION_SHEET_FALLBACK_KEY
  ).catch((err) => {
    console.error('Sheet sync failed (DB write succeeded):', err);
  });

  // Registration-received email — best-effort.
  sendRegistrationReceived(parentEmail, c.firstName).catch((err) => {
    console.error('Registration-received email failed:', err);
  });

  res.json({ id: camperId, consentAcceptedAt: acceptedAt.toISOString(), action });
});
