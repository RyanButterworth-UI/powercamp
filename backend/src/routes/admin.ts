import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { desc, isNull, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { signAdminToken } from '../services/auth';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';

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
