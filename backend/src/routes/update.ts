import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { verifyMagicToken } from '../services/auth';
import { appendToSheet } from '../services/sheets';
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
  try {
    const [existing] = await db
      .select({ id: campers.id })
      .from(campers)
      .where(
        and(eq(campers.parentEmail, parentEmail), eq(campers.year, env.CAMP_YEAR))
      );

    if (existing) {
      const [updated] = await db
        .update(campers)
        .set(camperPayload)
        .where(eq(campers.id, existing.id))
        .returning({ id: campers.id });
      camperId = updated.id;
    } else {
      const [inserted] = await db
        .insert(campers)
        .values(camperPayload)
        .returning({ id: campers.id });
      camperId = inserted.id;
    }
  } catch (err) {
    console.error('update DB error:', err);
    return res.status(500).json({ error: 'Failed to save registration' });
  }

  // Sheet append (best-effort). Cols A..P match the existing Mailchimp script's
  // expectations; col Q gets the consent-accepted timestamp.
  appendToSheet('Registrations', [
    c.firstName,
    c.lastName,
    c.camperCell ?? '',
    c.gender ?? '',
    camperEmail ?? '',
    c.age ?? '',
    c.grade ?? '',
    (c.friends ?? []).join(', '),
    c.medical ?? '',
    c.parentName ?? '',
    c.parentPhone ?? '',
    parentEmail,
    c.church ?? '',
    c.tshirt ?? '',
    c.generalInfo ?? '',
    c.dob ?? '',
    'TRUE',
  ]).catch((err) => {
    console.error('Sheet sync failed (DB write succeeded):', err);
  });

  // Registration-received email — best-effort.
  sendRegistrationReceived(parentEmail, c.firstName).catch((err) => {
    console.error('Registration-received email failed:', err);
  });

  res.json({ id: camperId, consentAcceptedAt: acceptedAt.toISOString() });
});
