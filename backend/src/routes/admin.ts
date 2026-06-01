import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { desc, eq, isNull } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db } from '../db/client';
import { campers, leaders } from '../db/schema';
import { signAdminToken, signLeaderInviteToken } from '../services/auth';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { appendToSheet } from '../services/sheets';
import {
  sendPaymentConfirmed,
  renderBlocksToHtml,
  blocksToPlainText,
  sendBulkEmail,
  EmailBlock,
  sendLeaderInvite,
  sendInviteSentReceipt,
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
    const rows = await db
      .select()
      .from(campers)
      .where(isNull(campers.deletedAt))
      .orderBy(desc(campers.year), campers.lastName, campers.firstName);

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

adminRouter.post('/admin/leaders/:id/approve', requireAdmin, async (req, res) => {
  if (!(await isNeilOk(req.body))) {
    return res.status(401).json({ error: 'Wrong Neil password' });
  }
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid leader id' });
  }
  try {
    const [row] = await db
      .update(leaders)
      .set({
        status: 'approved',
        approvedByNeil: true,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leaders.id, id))
      .returning({ id: leaders.id });
    if (!row) return res.status(404).json({ error: 'Leader not found' });
    res.json({ id: row.id, status: 'approved' });
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
    const [row] = await db
      .update(leaders)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(leaders.id, id))
      .returning({ id: leaders.id });
    if (!row) return res.status(404).json({ error: 'Leader not found' });
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

