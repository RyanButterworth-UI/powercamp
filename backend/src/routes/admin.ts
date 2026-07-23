import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { and, desc, eq, isNull } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db } from '../db/client';
import { campers, leaders } from '../db/schema';
import {
  signAdminToken,
  signEditorToken,
  signLeaderInviteToken,
  signConsentLinkToken,
} from '../services/auth';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { requireEditor } from '../middleware/require-editor';
import { requireDeletePassword } from '../middleware/require-delete-password';
import { deletePasswordRateLimiter } from '../middleware/rate-limit';
import { appendToSheet, upsertToSheet } from '../services/sheets';
import { leaderRow } from './leaders';
import {
  registrationSheetRow,
  REGISTRATION_SHEET_KEY,
  REGISTRATION_SHEET_FALLBACK_KEY,
} from '../lib/registration-sheet';
import { diffCamper } from '../lib/camper-diff';
import {
  sendPaymentConfirmed,
  renderBlocksToHtml,
  blocksToPlainText,
  sendBulkEmail,
  EmailBlock,
  sendLeaderInvite,
  sendInviteSentReceipt,
  sendLeaderRejection,
  sendRegistrationUpdated,
  sendConsentRequest,
} from '../services/email';
import {
  filterToSubscribed,
  listSubscriptions,
  setSubscribed,
} from '../services/subscriptions';
import { signUnsubscribeToken } from '../services/auth';
import { getRegistrationsOpen, setRegistrationsOpen } from '../services/settings';

// Neil-only second factor for the approve / reject endpoints. Hashed in env
// (NEIL_PASSWORD_HASH) the same way as ADMIN_PASSWORD_HASH. The previous
// hardcoded literal lived in source for months and must be considered leaked.
const neilGuard = z.object({ neilPassword: z.string() });

async function isNeilOk(input: unknown): Promise<boolean> {
  const parsed = neilGuard.safeParse(input);
  if (!parsed.success) return false;
  return bcrypt.compare(parsed.data.neilPassword, env.NEIL_PASSWORD_HASH);
}

const loginBody = z.object({
  password: z.string().min(1).max(200),
});

export const adminRouter = Router();

adminRouter.post('/admin/login', async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const ok = await bcrypt.compare(parsed.data.password, env.ADMIN_PASSWORD_HASH);
  if (!ok) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.json({ token: signAdminToken() });
});

adminRouter.get('/admin/campers', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(campers)
      .where(isNull(campers.deletedAt))
      .orderBy(desc(campers.year), campers.lastName, campers.firstName);
    res.json({
      total: rows.length,
      campers: rows,
    });
  } catch (err) {
    console.error('admin/campers error:', err);
    res.status(500).json({ error: 'Failed to load campers' });
  }
});

adminRouter.get('/admin/export', requireAdmin, async (_req, res) => {
  try {
    // Export the CURRENT camp year only — the XLSX is the working roster for
    // this year's camp, not a historical dump of prior cohorts.
    const rows = await db
      .select()
      .from(campers)
      .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt)))
      .orderBy(campers.lastName, campers.firstName);

    const friendly = rows.map((r) => ({
      ID: r.id,
      Year: r.year,
      'First Name': r.firstName,
      'Last Name': r.lastName,
      'Camper Email': r.email ?? '',
      'Camper Cell': r.camperCell ?? '',
      Gender: r.gender ?? '',
      Age: r.age ?? '',
      Grade: r.grade ?? '',
      DOB: r.dob ?? '',
      Friends: (r.friends ?? []).join(', '),
      Medical: r.medical ?? '',
      'Parent Name': r.parentName ?? '',
      'Parent Phone': r.parentPhone ?? '',
      'Parent Email': r.parentEmail,
      Church: r.church ?? '',
      'T-shirt': r.tshirt ?? '',
      'General Info': r.generalInfo ?? '',
      Source: r.source ?? '',
      'Consent General': r.consentGeneral ?? '',
      'Consent Location': r.consentLocation ?? '',
      'Consent Risk': r.consentRisk ?? '',
      'Consent Power Camp': r.consentPowerCamp ?? '',
      'Consent Behaviour': r.consentBehaviour ?? '',
      'Consent Photo': r.consentPhoto ?? '',
      'Emergency Contact Name': r.consentEmergencyName ?? '',
      'Emergency Contact Number': r.consentEmergencyContact ?? '',
      'Medical Aid Name': r.consentMedicalAidName ?? '',
      'Medical Aid Number': r.consentMedicalAidNumber ?? '',
      'Consent Date': r.consentDate ?? '',
      'Consent Accepted At': r.consentAcceptedAt ? r.consentAcceptedAt.toISOString() : '',
      'Payment Received At': r.paymentReceivedAt ? r.paymentReceivedAt.toISOString() : '',
      'Created At': r.createdAt ? r.createdAt.toISOString() : '',
      'Updated At': r.updatedAt ? r.updatedAt.toISOString() : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(friendly);
    XLSX.utils.book_append_sheet(wb, ws, 'Campers');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const filename = `powercamp-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('admin/export error:', err);
    res.status(500).json({ error: 'Failed to build export' });
  }
});

// Tiny endpoint so the FE guard can probe whether a token is still valid
// and pick up the active CAMP_YEAR (so the year tabs render even with no
// rows for the current year yet).
adminRouter.get('/admin/me', requireAdmin, (_req, res) => {
  res.json({ ok: true, campYear: env.CAMP_YEAR });
});

const updateEmailBody = z.object({
  parentEmail: z.string().email(),
});

adminRouter.post('/admin/campers/:id/update-email', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid camper id' });
  }
  const parsed = updateEmailBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  try {
    const [updated] = await db
      .update(campers)
      .set({ parentEmail: parsed.data.parentEmail.toLowerCase(), updatedAt: new Date() })
      .where(eq(campers.id, id))
      .returning({ id: campers.id, parentEmail: campers.parentEmail });
    if (!updated) return res.status(404).json({ error: 'Camper not found' });
    res.json(updated);
  } catch (err) {
    console.error('update-email error:', err);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// ---------- Inline edit (second-factor gated) ----------

// Step 1: an already-logged-in admin re-enters the inline-edit password to
// unlock editing for the session. Returns a short-lived editor token the FE
// sends back on each /edit call (in the X-Editor-Token header). We never
// store or echo the raw password — only Ryan + Shayln know it.
const editorUnlockBody = z.object({ password: z.string().min(1).max(200) });

adminRouter.post('/admin/editor/unlock', requireAdmin, async (req, res) => {
  const parsed = editorUnlockBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const ok = await bcrypt.compare(parsed.data.password, env.EDITOR_PASSWORD_HASH);
  if (!ok) {
    return res.status(401).json({ error: 'Wrong edit password' });
  }
  res.json({ token: signEditorToken() });
});

// Step 2: edit a single camper's details. Gated by requireAdmin (you're on the
// dashboard) AND requireEditor (you unlocked editing this session). Edits every
// field EXCEPT the six consent agreements + consent date + consentAcceptedAt —
// the signed consent record is never touched here. On a real change we re-sync
// the Google Sheet (same builder/keys as the public /update flow, so the same
// row is overwritten) and email the family a "your details were updated" note
// listing exactly what changed, old → new.
const editOptionalString = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v) => (v === null || v === undefined ? undefined : String(v)));

const editCamperBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  parentEmail: z.string().email(),
  dob: editOptionalString,
  gender: editOptionalString,
  age: editOptionalString,
  grade: editOptionalString,
  email: z.union([z.string().email(), z.literal('')]).optional().nullable()
    .transform((v) => (v ? v : undefined)),
  camperCell: editOptionalString,
  medical: editOptionalString,
  tshirt: editOptionalString,
  church: editOptionalString,
  generalInfo: editOptionalString,
  friends: z.array(z.string()).optional(),
  parentName: editOptionalString,
  parentPhone: editOptionalString,
  consentEmergencyName: editOptionalString,
  consentEmergencyContact: editOptionalString,
  consentMedicalAidName: editOptionalString,
  consentMedicalAidNumber: editOptionalString,
});

adminRouter.post('/admin/campers/:id/edit', requireAdmin, requireEditor, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid camper id' });
  }
  const parsed = editCamperBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  const p = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(campers)
      .where(eq(campers.id, id))
      .limit(1);
    if (!existing || existing.deletedAt) {
      return res.status(404).json({ error: 'Camper not found' });
    }

    const camperEmail = p.email ? p.email.toLowerCase() : undefined;
    const parentEmail = p.parentEmail.toLowerCase();

    // The normalised set of editable values we're about to write. Keys match
    // the camper columns so diffCamper can compare like-for-like.
    const after = {
      firstName: p.firstName,
      lastName: p.lastName,
      dob: p.dob,
      gender: p.gender,
      age: p.age,
      grade: p.grade,
      email: camperEmail,
      camperCell: p.camperCell,
      medical: p.medical,
      tshirt: p.tshirt,
      church: p.church,
      generalInfo: p.generalInfo,
      friends: p.friends ?? [],
      parentName: p.parentName,
      parentPhone: p.parentPhone,
      parentEmail,
      consentEmergencyName: p.consentEmergencyName,
      consentEmergencyContact: p.consentEmergencyContact,
      consentMedicalAidName: p.consentMedicalAidName,
      consentMedicalAidNumber: p.consentMedicalAidNumber,
    };

    const changes = diffCamper(existing as Record<string, unknown>, after);

    // No real change → don't write, don't email, don't touch the sheet. Saving
    // an unchanged form shouldn't spam the family a "your details changed" note.
    if (changes.length === 0) {
      return res.json({ id: existing.id, changed: 0, changes: [] });
    }

    // Persist. Note: consent agreement columns + consentDate + consentAcceptedAt
    // are deliberately NOT in this set — the signed consent record is immutable
    // from this endpoint. Optional blanks are coalesced to null so CLEARING a
    // field actually nulls the column (drizzle silently SKIPS `undefined`, which
    // would leave a "cleared" field stale and out of sync with the diff/email).
    const nullable = <T>(v: T | undefined): T | null => (v === undefined ? null : v);
    await db
      .update(campers)
      .set({
        firstName: after.firstName,
        lastName: after.lastName,
        parentEmail: after.parentEmail,
        friends: after.friends,
        dob: nullable(after.dob),
        gender: nullable(after.gender),
        age: nullable(after.age),
        grade: nullable(after.grade),
        email: nullable(after.email),
        camperCell: nullable(after.camperCell),
        medical: nullable(after.medical),
        tshirt: nullable(after.tshirt),
        church: nullable(after.church),
        generalInfo: nullable(after.generalInfo),
        parentName: nullable(after.parentName),
        parentPhone: nullable(after.parentPhone),
        consentEmergencyName: nullable(after.consentEmergencyName),
        consentEmergencyContact: nullable(after.consentEmergencyContact),
        consentMedicalAidName: nullable(after.consentMedicalAidName),
        consentMedicalAidNumber: nullable(after.consentMedicalAidNumber),
        updatedAt: new Date(),
      })
      .where(eq(campers.id, id));

    // Best-effort sheet re-sync — same builder + keys as /submit and /update so
    // the camper's existing row is overwritten in place, never duplicated. The
    // consent date carries over from the stored record (we don't edit it).
    upsertToSheet(
      'Registrations',
      registrationSheetRow(
        {
          firstName: after.firstName,
          lastName: after.lastName,
          camperCell: after.camperCell,
          gender: after.gender,
          email: after.email,
          age: after.age,
          grade: after.grade,
          friends: after.friends,
          medical: after.medical,
          parentName: after.parentName,
          parentPhone: after.parentPhone,
          parentEmail: after.parentEmail,
          church: after.church,
          tshirt: after.tshirt,
          generalInfo: after.generalInfo,
          dob: after.dob,
        },
        {
          emergencyName: after.consentEmergencyName,
          emergencyContact: after.consentEmergencyContact,
          medicalAidName: after.consentMedicalAidName,
          medicalAidNumber: after.consentMedicalAidNumber,
          date: existing.consentDate ?? undefined,
        },
        existing.id,
        existing.year
      ),
      REGISTRATION_SHEET_KEY,
      REGISTRATION_SHEET_FALLBACK_KEY
    ).catch((err) => {
      console.error('Sheet sync failed (admin edit; DB write succeeded):', err);
    });

    // Best-effort "your details were updated" email, with the old → new list.
    sendRegistrationUpdated(parentEmail, after.firstName, camperEmail, changes).catch((err) => {
      console.error('Admin-edit update email failed:', err);
    });

    res.json({ id: existing.id, changed: changes.length, changes });
  } catch (err) {
    console.error('camper edit error:', err);
    res.status(500).json({ error: 'Failed to save changes' });
  }
});

adminRouter.post('/admin/campers/:id/mark-paid', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid camper id' });
  }
  try {
    const [updated] = await db
      .update(campers)
      .set({ paymentReceivedAt: new Date(), updatedAt: new Date() })
      .where(eq(campers.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Camper not found' });

    // Best-effort: append to the Payments sheet tab so organisers see a
    // running log alongside the live registration sheet.
    appendToSheet('Payments', [
      new Date().toISOString(),
      String(updated.id),
      `${updated.firstName} ${updated.lastName}`,
      updated.parentEmail,
      updated.email ?? '',
      String(updated.year),
    ]).catch((err) => {
      console.error('Payments sheet sync failed (DB write succeeded):', err);
    });

    // Best-effort confirmation email to parent + camper (CCed when present).
    sendPaymentConfirmed(updated.parentEmail, updated.firstName, updated.email).catch((err) => {
      console.error('Payment-confirmed email failed:', err);
    });

    res.json({ id: updated.id, paymentReceivedAt: updated.paymentReceivedAt });
  } catch (err) {
    console.error('mark-paid error:', err);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

// Email a parent a link to complete the consent block for a camper we already
// hold the details for — an imported/phone registration, or a family just moved
// off the waiting list. The link opens the same magic-link edit/consent form
// used everywhere else, on a 12-hour token so it survives the parent not
// checking their inbox straight away. The send is awaited so a failure surfaces
// to the admin as a 500 rather than a silent "sent".
adminRouter.post('/admin/campers/:id/request-consent', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid camper id' });
  }
  try {
    const [camper] = await db
      .select({
        id: campers.id,
        firstName: campers.firstName,
        parentEmail: campers.parentEmail,
        deletedAt: campers.deletedAt,
      })
      .from(campers)
      .where(eq(campers.id, id))
      .limit(1);

    if (!camper || camper.deletedAt) {
      return res.status(404).json({ error: 'Camper not found' });
    }
    if (!camper.parentEmail) {
      return res.status(400).json({ error: 'Camper has no parent email on file' });
    }

    const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/verify-link?token=${encodeURIComponent(
      signConsentLinkToken(camper.id)
    )}`;
    await sendConsentRequest(camper.parentEmail, camper.firstName, url);

    res.json({ ok: true, sentTo: camper.parentEmail });
  } catch (err) {
    console.error('request-consent error:', err);
    res.status(500).json({ error: 'Failed to send the consent request' });
  }
});

// Mirrors /admin/campers/:id/mark-paid. Leaders pay for camp too — this
// keeps the admin queue honest. Same best-effort sheet append and
// payment-confirmed email side-effects as the camper version.
adminRouter.post('/admin/leaders/:id/mark-paid', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid leader id' });
  }
  try {
    const [updated] = await db
      .update(leaders)
      .set({ paymentReceivedAt: new Date(), updatedAt: new Date() })
      .where(eq(leaders.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Leader not found' });

    appendToSheet('Payments', [
      new Date().toISOString(),
      String(updated.id),
      `${updated.firstName} ${updated.lastName}`,
      updated.email,
      'leader',
      String(updated.year),
    ]).catch((err) => {
      console.error('Payments sheet sync failed (DB write succeeded):', err);
    });

    sendPaymentConfirmed(updated.email, updated.firstName, null).catch((err) => {
      console.error('Payment-confirmed email failed:', err);
    });

    res.json({ id: updated.id, paymentReceivedAt: updated.paymentReceivedAt });
  } catch (err) {
    console.error('leader mark-paid error:', err);
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

// ----- Soft delete -----
//
// Deleting stamps deleted_at rather than removing the row. Every read path
// already filters `isNull(deletedAt)`, so the record leaves the dashboard, the
// XLSX export, the stats and the magic-link lookups the moment it's stamped —
// and the duplicate guard in POST /submit ignores it too, so a family whose
// registration was deleted can register again. A mis-click is recoverable
// straight from the DB: `UPDATE campers SET deleted_at = NULL WHERE id = ...`.
//
// Two gates: requireAdmin (signed in) AND the delete password. Admin access on
// its own cannot destroy data. The Google Sheet mirror is deliberately left
// untouched — it is an append-only log, not a source of truth.

adminRouter.post(
  '/admin/campers/:id/delete',
  requireAdmin,
  deletePasswordRateLimiter,
  requireDeletePassword,
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid camper id' });
    }
    try {
      // isNull(deletedAt) in the WHERE makes a repeat click a 404 instead of
      // quietly overwriting the original deletion timestamp.
      const [row] = await db
        .update(campers)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(campers.id, id), isNull(campers.deletedAt)))
        .returning({
          id: campers.id,
          firstName: campers.firstName,
          lastName: campers.lastName,
        });
      if (!row) return res.status(404).json({ error: 'Camper not found' });

      console.warn(`[delete] camper ${row.id} — ${row.firstName} ${row.lastName}`);
      res.json({ id: row.id, deleted: true });
    } catch (err) {
      console.error('camper delete error:', err);
      res.status(500).json({ error: 'Failed to delete camper' });
    }
  }
);

adminRouter.post(
  '/admin/leaders/:id/delete',
  requireAdmin,
  deletePasswordRateLimiter,
  requireDeletePassword,
  async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid leader id' });
    }
    try {
      const [row] = await db
        .update(leaders)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(leaders.id, id), isNull(leaders.deletedAt)))
        .returning({
          id: leaders.id,
          firstName: leaders.firstName,
          lastName: leaders.lastName,
        });
      if (!row) return res.status(404).json({ error: 'Leader not found' });

      console.warn(`[delete] leader ${row.id} — ${row.firstName} ${row.lastName}`);
      res.json({ id: row.id, deleted: true });
    } catch (err) {
      console.error('leader delete error:', err);
      res.status(500).json({ error: 'Failed to delete leader' });
    }
  }
);

adminRouter.get('/admin/leaders', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(leaders)
      .where(isNull(leaders.deletedAt))
      // Order by registration date (newest first) so the admin sees fresh
      // applications at the top of the queue rather than buried in
      // alphabetical pages of approved leaders.
      .orderBy(desc(leaders.createdAt));
    res.json({ total: rows.length, leaders: rows });
  } catch (err) {
    console.error('admin/leaders error:', err);
    res.status(500).json({ error: 'Failed to load leaders' });
  }
});

const leaderDecisionBody = z.object({
  neilPassword: z.string(),
});

// Reflect a leader's new status in the Leaders sheet tab. The apply flow
// appended a 'pending' row; approve/reject must UPDATE that row in place
// (keyed on the email column, E / index 4) instead of leaving the sheet
// stale or appending a duplicate. Best-effort — never blocks the decision.
type LeaderDecisionRow = typeof leaders.$inferSelect;
function syncLeaderSheetRow(
  leader: LeaderDecisionRow,
  status: 'approved' | 'rejected',
  approvedByNeil: boolean
): Promise<void> {
  return upsertToSheet(
    'Leaders',
    leaderRow({
      firstName: leader.firstName,
      lastName: leader.lastName,
      cell: leader.cell ?? undefined,
      gender: leader.gender ?? undefined,
      email: leader.email,
      age: leader.age ?? undefined,
      grade: leader.grade ?? undefined,
      church: leader.church ?? undefined,
      tshirt: leader.tshirt ?? undefined,
      parentName: leader.parentName ?? undefined,
      parentPhone: leader.parentPhone ?? undefined,
      parentEmail: leader.parentEmail ?? undefined,
      applicationNotes: leader.applicationNotes ?? undefined,
      status,
      approvedByNeil,
      createdAt: leader.createdAt ? new Date(leader.createdAt).toISOString() : undefined,
      medical: leader.medical ?? undefined,
      generalInfo: leader.generalInfo ?? undefined,
      id: leader.id,
      year: leader.year,
      dob: leader.dob ?? undefined,
      emergencyName: leader.consentEmergencyName ?? undefined,
      emergencyContact: leader.consentEmergencyContact ?? undefined,
      medicalAidName: leader.consentMedicalAidName ?? undefined,
      medicalAidNumber: leader.consentMedicalAidNumber ?? undefined,
      consentDate: leader.consentDate ?? undefined,
      consentAccepted: !!leader.consentAcceptedAt,
    }),
    [4]
  );
}

adminRouter.post('/admin/leaders/:id/approve', requireAdmin, async (req, res) => {
  if (!(await isNeilOk(req.body))) {
    return res.status(401).json({ error: 'Wrong Neil password' });
  }
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid leader id' });
  }
  try {
    // Idempotency guard: if the leader is already approved, don't update or
    // re-send the invite. Otherwise a double-click (or an accidental re-press)
    // fires a second invite email and a second sheet write. Re-sending an
    // invite on purpose is what the dedicated /invite endpoint is for.
    const [existing] = await db.select().from(leaders).where(eq(leaders.id, id));
    if (!existing || existing.deletedAt) {
      return res.status(404).json({ error: 'Leader not found' });
    }
    if (existing.status === 'approved') {
      return res.json({ id: existing.id, status: 'approved', invitedTo: existing.email, alreadyApproved: true });
    }

    const [row] = await db
      .update(leaders)
      .set({
        status: 'approved',
        approvedByNeil: true,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leaders.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Leader not found' });

    // Approval now emails the leader their registration link directly, so a
    // single click both approves and invites — no separate manual step. The
    // standalone "Send invite" action remains as a re-send. Best-effort: a
    // Gmail hiccup shouldn't roll back the approval (Neil can re-send).
    const token = signLeaderInviteToken(row.id);
    const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/leader-register?token=${encodeURIComponent(token)}`;
    sendLeaderInvite(row.email, row.firstName, url).catch((err) =>
      console.error('Approval invite email failed:', err)
    );

    syncLeaderSheetRow(row, 'approved', true).catch((err) =>
      console.error('Leader sheet status sync failed (approve):', err)
    );

    res.json({ id: row.id, status: 'approved', invitedTo: row.email });
  } catch (err) {
    console.error('approve error:', err);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// Issues a single-use 7-day invite token for an approved leader and emails
// it to them as a magic-link to /leader-register. Neil also gets a copy of
// the receipt so he has a record that the invite went out.
adminRouter.post('/admin/leaders/:id/invite', requireAdmin, async (req, res) => {
  if (!(await isNeilOk(req.body))) {
    return res.status(401).json({ error: 'Wrong Neil password' });
  }
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid leader id' });
  }
  try {
    const [leader] = await db.select().from(leaders).where(eq(leaders.id, id));
    if (!leader || leader.deletedAt) {
      return res.status(404).json({ error: 'Leader not found' });
    }
    if (leader.status !== 'approved') {
      return res.status(400).json({ error: 'Leader must be approved before they can be invited' });
    }

    const token = signLeaderInviteToken(leader.id);
    const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/leader-register?token=${encodeURIComponent(token)}`;

    // Send the leader's invite first — that's the one that matters; the
    // Neil receipt is fire-and-forget. If the leader's send fails the
    // admin sees the error and can retry.
    await sendLeaderInvite(leader.email, leader.firstName, url);

    sendInviteSentReceipt(env.NEIL_EMAIL ?? env.GMAIL_USER, {
      firstName: leader.firstName,
      lastName: leader.lastName,
      email: leader.email,
    }).catch((err) => console.error('Invite-sent receipt failed:', err));

    res.json({ id: leader.id, sentTo: leader.email });
  } catch (err) {
    console.error('leader invite error:', err);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

adminRouter.post('/admin/leaders/:id/reject', requireAdmin, async (req, res) => {
  if (!(await isNeilOk(req.body))) {
    return res.status(401).json({ error: 'Wrong Neil password' });
  }
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid leader id' });
  }
  try {
    // Idempotency guard — same reasoning as approve: a repeat click must not
    // fire a second decline email or a second sheet write.
    const [existing] = await db.select().from(leaders).where(eq(leaders.id, id));
    if (!existing || existing.deletedAt) {
      return res.status(404).json({ error: 'Leader not found' });
    }
    if (existing.status === 'rejected') {
      return res.json({ id: existing.id, status: 'rejected', alreadyRejected: true });
    }

    const [row] = await db
      .update(leaders)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(leaders.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: 'Leader not found' });

    // Let the applicant know — a warm, brief decline. Best-effort.
    sendLeaderRejection(row.email, row.firstName).catch((err) =>
      console.error('Leader rejection email failed:', err)
    );

    syncLeaderSheetRow(row, 'rejected', false).catch((err) =>
      console.error('Leader sheet status sync failed (reject):', err)
    );

    res.json({ id: row.id, status: 'rejected' });
  } catch (err) {
    console.error('reject error:', err);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

// ---------- Bulk email ----------

const blockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('heading'), text: z.string().min(1).max(200) }),
  z.object({ kind: z.literal('paragraph'), text: z.string().min(1).max(4000) }),
  z.object({
    kind: z.literal('button'),
    text: z.string().min(1).max(80),
    url: z.string().url(),
  }),
  z.object({ kind: z.literal('divider') }),
]);

const bulkEmailBody = z.object({
  subject: z.string().min(1).max(200),
  blocks: z.array(blockSchema).min(1).max(50),
  recipients: z.array(z.string().email()).min(1).max(500),
});

adminRouter.post('/admin/bulk-email', requireAdmin, async (req, res) => {
  const parsed = bulkEmailBody.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'Invalid bulk email request', details: parsed.error.flatten() });
  }
  const { subject, blocks, recipients } = parsed.data;
  // Dedup + normalise recipients, then drop anyone who has unsubscribed.
  const uniq = Array.from(new Set(recipients.map((r) => r.trim().toLowerCase())));

  try {
    const { allowed, skipped } = await filterToSubscribed(uniq);
    const text = blocksToPlainText(blocks as EmailBlock[]);

    const result = await sendBulkEmail(subject, allowed, (email) => {
      const url = `${env.APP_BASE_URL}/unsubscribe?token=${encodeURIComponent(
        signUnsubscribeToken(email)
      )}`;
      return {
        html: renderBlocksToHtml(subject, blocks as EmailBlock[], url),
        text: text + `\n\nDon't want these? Unsubscribe: ${url}`,
      };
    });

    res.json({
      ...result,
      totalRecipients: uniq.length,
      unsubscribedSkipped: skipped.length,
    });
  } catch (err) {
    console.error('bulk-email error:', err);
    res.status(500).json({ error: 'Failed to send bulk email' });
  }
});

// Render-only endpoint so the FE preview can mirror the server's exact HTML
// without re-implementing the renderer.
adminRouter.post('/admin/bulk-email/preview', requireAdmin, (req, res) => {
  const parsed = z
    .object({ subject: z.string().min(1).max(200), blocks: z.array(blockSchema) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid preview request' });
  }
  const html = renderBlocksToHtml(
    parsed.data.subject,
    parsed.data.blocks as EmailBlock[],
    `${env.APP_BASE_URL}/unsubscribe?token=preview`
  );
  res.json({ html });
});

// Subscriptions management.
adminRouter.get('/admin/subscriptions', requireAdmin, async (_req, res) => {
  try {
    const rows = await listSubscriptions();
    res.json({
      total: rows.length,
      subscribed: rows.filter((r) => r.subscribed).length,
      subscriptions: rows,
    });
  } catch (err) {
    console.error('list subscriptions error:', err);
    res.status(500).json({ error: 'Failed to load subscriptions' });
  }
});

const toggleBody = z.object({ email: z.string().email(), subscribed: z.boolean() });

adminRouter.post('/admin/subscriptions/toggle', requireAdmin, async (req, res) => {
  const parsed = toggleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    await setSubscribed(parsed.data.email, parsed.data.subscribed);
    res.json({ ok: true });
  } catch (err) {
    console.error('toggle subscription error:', err);
    res.status(500).json({ error: 'Failed to toggle' });
  }
});

// ---------- Registrations open/closed ----------

adminRouter.get('/admin/registration-status', requireAdmin, async (_req, res) => {
  try {
    res.json({ registrationsOpen: await getRegistrationsOpen() });
  } catch (err) {
    console.error('get registration-status error:', err);
    res.status(500).json({ error: 'Failed to read registration status' });
  }
});

const registrationStatusBody = z.object({ open: z.boolean() });

adminRouter.post('/admin/registration-status', requireAdmin, async (req, res) => {
  const parsed = registrationStatusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const registrationsOpen = await setRegistrationsOpen(parsed.data.open);
    res.json({ registrationsOpen });
  } catch (err) {
    console.error('set registration-status error:', err);
    res.status(500).json({ error: 'Failed to update registration status' });
  }
});

