import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { leaders } from '../db/schema';
import { env } from '../env';
import { appendToSheet, upsertToSheet } from '../services/sheets';
import { ensureSubscription } from '../services/subscriptions';
import {
  sendLeaderApplicationNotice,
  sendLeaderApplicationReceived,
  sendLeaderRegistrationComplete,
} from '../services/email';
import { verifyLeaderInviteToken } from '../services/auth';

// Leaders sheet tab column order:
// A firstName, B lastName, C cell, D gender, E email, F age, G grade,
// H church, I tshirt, J parentName, K parentPhone, L parentEmail,
// M applicationNotes, N status, O approvedByNeil, P createdAt,
// Q medical, R generalInfo, S id, T year, U dob, V emergency name,
// W emergency number, X medical aid name, Y medical aid number,
// Z consent date, AA consent accepted.
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
  // Original application timestamp. Passed through on later updates (approve/
  // reject sheet sync) so re-writing the row in place doesn't reset col P to
  // "now". Defaults to now for a fresh application row.
  createdAt?: string;
  // Captured on the post-approval registration form (camper-parity, minus
  // the parent block). Appended after the established A..P block so existing
  // column positions don't shift.
  medical?: string;
  generalInfo?: string;
  id?: number;
  year?: number;
  dob?: string;
  emergencyName?: string;
  emergencyContact?: string;
  medicalAidName?: string;
  medicalAidNumber?: string;
  consentDate?: string;
  consentAccepted?: boolean;
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
    d.createdAt ?? new Date().toISOString(),
    d.medical ?? '',                          // Q
    d.generalInfo ?? '',                      // R
    d.id ?? '',                               // S leader id
    d.year ?? '',                             // T year
    d.dob ?? '',                              // U
    d.emergencyName ?? '',                    // V
    d.emergencyContact ?? '',                 // W
    d.medicalAidName ?? '',                   // X
    d.medicalAidNumber ?? '',                 // Y
    d.consentDate ?? '',                      // Z
    d.consentAccepted ? 'TRUE' : '',          // AA
  ];
}

export { leaderRow };

// Public application body. The password gate is gone — applications are
// now open. The two screening booleans (out-of-school / church-involved)
// are gated client-side; if either is false the FE never POSTs here, and
// the applicant just sees the "we regret to inform you…" message inline.
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

leadersRouter.post('/leaders/apply', async (req, res) => {
  // Leadership for 2026 is full of great candidates, so the public application
  // is closed (LEADER_APPLICATIONS_OPEN defaults to false). Reject before
  // touching the DB / sheet / email so a direct POST can't slip a new applicant
  // in behind the now-removed UI. Invite-only completion (/leaders/register)
  // stays open for already-approved leaders. Flip the env flag to reopen.
  if (!env.LEADER_APPLICATIONS_OPEN) {
    return res.status(403).json({
      error: 'Leader applications are closed',
      reason: 'full',
    });
  }

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
      leaderRow({
        ...data,
        email: data.email.toLowerCase(),
        status: 'pending',
        approvedByNeil: false,
        id: row.id,
        year: env.CAMP_YEAR,
      })
    ).catch((err) => {
      console.error('Leader sheet sync failed (DB write succeeded):', err);
    });

    ensureSubscription(data.email.toLowerCase(), 'leader-application').catch((err) =>
      console.error('Subscription upsert failed (leader):', err)
    );

    // Notify Neil so he doesn't have to refresh the admin panel to spot
    // new applications. Best-effort: a Gmail hiccup shouldn't block the
    // applicant's success response.
    sendLeaderApplicationNotice(env.NEIL_EMAIL ?? env.GMAIL_USER, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      church: data.church,
      applicationNotes: data.applicationNotes,
    }).catch((err) => console.error('Neil notification email failed:', err));

    // Acknowledge the applicant straight away ("we've got it, you're awaiting
    // approval — remember to email Neil your motivation"). Best-effort.
    sendLeaderApplicationReceived(data.email.toLowerCase(), data.firstName).catch((err) =>
      console.error('Leader application-received email failed:', err)
    );

    res.json({ id: row.id });
  } catch (err) {
    console.error('leaders/apply error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Verifies a Neil-issued invite token and returns the leader row so the
// /leader-register page can pre-populate the form with what we already
// know about them (name + email at minimum).
const inviteTokenBody = z.object({
  token: z.string().min(10),
});

leadersRouter.post('/leaders/verify-invite', async (req, res) => {
  const parsed = inviteTokenBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const claims = verifyLeaderInviteToken(parsed.data.token);
  if (!claims) {
    return res.status(401).json({ error: 'Invalid or expired invite' });
  }

  try {
    const [leader] = await db.select().from(leaders).where(eq(leaders.id, claims.leaderId));
    if (!leader || leader.deletedAt) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (leader.status !== 'approved') {
      return res.status(403).json({ error: 'Application is not approved' });
    }
    res.json({
      leader: {
        id: leader.id,
        firstName: leader.firstName,
        lastName: leader.lastName,
        email: leader.email,
        cell: leader.cell,
        gender: leader.gender,
        age: leader.age,
        grade: leader.grade,
        dob: leader.dob,
        church: leader.church,
        tshirt: leader.tshirt,
        medical: leader.medical,
        generalInfo: leader.generalInfo,
        // Prior consent values (or null) so the edit form can prefill instead
        // of forcing a re-tick. Stored as 'accept' / null on the row.
        consentGeneral: leader.consentGeneral,
        consentLocation: leader.consentLocation,
        consentRisk: leader.consentRisk,
        consentPowerCamp: leader.consentPowerCamp,
        consentBehaviour: leader.consentBehaviour,
        consentPhoto: leader.consentPhoto,
        consentEmergencyName: leader.consentEmergencyName,
        consentEmergencyContact: leader.consentEmergencyContact,
        consentMedicalAidName: leader.consentMedicalAidName,
        consentMedicalAidNumber: leader.consentMedicalAidNumber,
        consentDate: leader.consentDate,
      },
    });
  } catch (err) {
    console.error('leaders/verify-invite error:', err);
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});

// Finalizes a leader's registration. The form mirrors the camper details
// (minus the parent block): dropdowns for gender/age/grade/t-shirt, DOB,
// church, medical/allergy notes, "anything else", PLUS the full consent block
// (six agreements, emergency contact, medical aid) — worded in the first
// person for an adult registering themselves. `grade` doubles as
// grade-or-occupation. Consent is mandatory; the detail fields are lenient
// server-side (the form gates them client-side).
const registerBody = z.object({
  token: z.string().min(10),
  cell: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  grade: z.string().optional(),
  dob: z.string().optional(),
  church: z.string().optional(),
  tshirt: z.string().optional(),
  medical: z.string().optional(),
  generalInfo: z.string().optional(),
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

leadersRouter.post('/leaders/register', async (req, res) => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  const claims = verifyLeaderInviteToken(parsed.data.token);
  if (!claims) {
    return res.status(401).json({ error: 'Invalid or expired invite' });
  }

  const { token: _token, consent, ...patch } = parsed.data;
  const acceptedAt = new Date();
  try {
    // A valid 7-day token isn't enough on its own: re-check the leader is
    // still approved and not removed before saving. Otherwise someone
    // approved, then rejected/deleted, could still complete registration
    // within the token window. Mirrors the guard in /leaders/verify-invite.
    const [leader] = await db.select().from(leaders).where(eq(leaders.id, claims.leaderId));
    if (!leader || leader.deletedAt) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (leader.status !== 'approved') {
      return res.status(403).json({ error: 'Application is not approved' });
    }

    const [updated] = await db
      .update(leaders)
      .set({
        cell: patch.cell ?? null,
        gender: patch.gender ?? null,
        age: patch.age ?? null,
        grade: patch.grade ?? null,
        dob: patch.dob ?? null,
        church: patch.church ?? null,
        tshirt: patch.tshirt ?? null,
        medical: patch.medical ?? null,
        generalInfo: patch.generalInfo ?? null,
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
        year: env.CAMP_YEAR,
        updatedAt: new Date(),
      })
      .where(eq(leaders.id, claims.leaderId))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Leader not found' });

    // Confirm completion to the leader — closes the email chain (apply ack →
    // approval+link → done). Best-effort: a Gmail hiccup mustn't fail the save.
    sendLeaderRegistrationComplete(updated.email, updated.firstName).catch((err) =>
      console.error('Leader registration-complete email failed:', err)
    );

    // Reflect the now-complete record (details + consent + emergency + medical
    // aid) in the Leaders sheet by updating the leader's existing row in place,
    // keyed on the email column (E / index 4) — so the sheet no longer shows
    // the blanks captured at apply time. Best-effort.
    upsertToSheet(
      'Leaders',
      leaderRow({
        firstName: updated.firstName,
        lastName: updated.lastName,
        cell: updated.cell ?? undefined,
        gender: updated.gender ?? undefined,
        email: updated.email,
        age: updated.age ?? undefined,
        grade: updated.grade ?? undefined,
        church: updated.church ?? undefined,
        tshirt: updated.tshirt ?? undefined,
        parentName: updated.parentName ?? undefined,
        parentPhone: updated.parentPhone ?? undefined,
        parentEmail: updated.parentEmail ?? undefined,
        applicationNotes: updated.applicationNotes ?? undefined,
        status: updated.status as 'pending' | 'approved' | 'rejected',
        approvedByNeil: updated.approvedByNeil,
        createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : undefined,
        medical: updated.medical ?? undefined,
        generalInfo: updated.generalInfo ?? undefined,
        id: updated.id,
        year: updated.year,
        dob: updated.dob ?? undefined,
        emergencyName: updated.consentEmergencyName ?? undefined,
        emergencyContact: updated.consentEmergencyContact ?? undefined,
        medicalAidName: updated.consentMedicalAidName ?? undefined,
        medicalAidNumber: updated.consentMedicalAidNumber ?? undefined,
        consentDate: updated.consentDate ?? undefined,
        consentAccepted: !!updated.consentAcceptedAt,
      }),
      [4]
    ).catch((err) => console.error('Leader sheet sync failed (register):', err));

    res.json({ id: updated.id });
  } catch (err) {
    console.error('leaders/register error:', err);
    res.status(500).json({ error: 'Failed to save registration' });
  }
});
