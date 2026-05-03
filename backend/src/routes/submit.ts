import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { appendToSheet } from '../services/sheets';
import { sendRegistrationReceived } from '../services/email';
import { ensureSubscription } from '../services/subscriptions';

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

type CamperInput = z.infer<typeof camperBody>;

// Column order MUST match the existing sheet so the Mailchimp Apps Script
// (processNewRows) keeps reading firstName from A, lastName from B,
// email from E, parentName from J, parentEmail from L. Q='TRUE' since
// /submit only fires after the mandatory consent step.
function toSheetRow(d: CamperInput): (string | number | null)[] {
  return [
    d.firstName,                  // A
    d.lastName,                   // B
    d.camperCell ?? '',           // C
    d.gender ?? '',               // D
    d.email ?? '',                // E
    d.age ?? '',                  // F
    d.grade ?? '',                // G
    (d.friends ?? []).join(', '), // H
    d.medical ?? '',              // I
    d.parentName ?? '',           // J
    d.parentPhone ?? '',          // K
    d.parentEmail,                // L
    d.church ?? '',               // M
    d.tshirt ?? '',               // N
    d.generalInfo ?? '',          // O
    d.dob ?? '',                  // P
    'TRUE',                       // Q — consent accepted (gated by ConsentStepComponent before submit)
  ];
}

export const submitRouter = Router();

submitRouter.post('/submit', async (req, res) => {
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
    const [row] = await db
      .insert(campers)
      .values({
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

    appendToSheet('Registrations', toSheetRow({ ...c, parentEmail, email: camperEmail })).catch((err) => {
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
