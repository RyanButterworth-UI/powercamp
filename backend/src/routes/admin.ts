import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { desc, eq, isNull } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db } from '../db/client';
import { campers, leaders } from '../db/schema';
import { signAdminToken } from '../services/auth';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { appendToSheet } from '../services/sheets';
import { sendPaymentConfirmed } from '../services/email';
import { leaderRow } from './leaders';

// Hardcoded by design (per spec) — Neil's approve / reject / direct-add password.
const NEIL_PASSWORD = 'gravelROx';

const neilGuard = z.object({ neilPassword: z.string() });

function isNeilOk(input: unknown): boolean {
  const parsed = neilGuard.safeParse(input);
  return parsed.success && parsed.data.neilPassword === NEIL_PASSWORD;
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

// Tiny endpoint so the FE guard can probe whether a token is still valid.
adminRouter.get('/admin/me', requireAdmin, (_req, res) => {
  res.json({ ok: true });
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

adminRouter.get('/admin/leaders', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(leaders)
      .where(isNull(leaders.deletedAt))
      .orderBy(desc(leaders.year), leaders.lastName, leaders.firstName);
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
  if (!isNeilOk(req.body)) {
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

adminRouter.post('/admin/leaders/:id/reject', requireAdmin, async (req, res) => {
  if (!isNeilOk(req.body)) {
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

const directAddBody = z.object({
  neilPassword: z.string(),
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

adminRouter.post('/admin/leaders/direct-add', requireAdmin, async (req, res) => {
  const parsed = directAddBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  if (parsed.data.neilPassword !== NEIL_PASSWORD) {
    return res.status(401).json({ error: 'Wrong Neil password' });
  }
  const d = parsed.data;
  try {
    const [row] = await db
      .insert(leaders)
      .values({
        year: env.CAMP_YEAR,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email.toLowerCase(),
        cell: d.cell,
        gender: d.gender,
        age: d.age,
        grade: d.grade,
        church: d.church,
        tshirt: d.tshirt,
        parentName: d.parentName,
        parentPhone: d.parentPhone,
        parentEmail: d.parentEmail?.toLowerCase(),
        applicationNotes: d.applicationNotes,
        status: 'approved',
        approvedByNeil: true,
        approvedAt: new Date(),
      })
      .returning({ id: leaders.id });

    appendToSheet(
      'Leaders',
      leaderRow({ ...d, email: d.email.toLowerCase(), status: 'approved', approvedByNeil: true })
    ).catch((err) => {
      console.error('Leader sheet sync failed (DB write succeeded):', err);
    });

    res.json({ id: row.id, status: 'approved' });
  } catch (err) {
    console.error('direct-add error:', err);
    res.status(500).json({ error: 'Failed to add leader' });
  }
});
