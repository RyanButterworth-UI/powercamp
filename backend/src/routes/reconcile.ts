import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { getSheetValues } from '../services/sheets';
import { reconcileRegistrations } from '../lib/reconcile';

export const reconcileRouter = Router();

// Read-only drift report between the Registrations sheet and the campers table.
// Reads both sides, diffs them (see lib/reconcile.ts) and returns three buckets:
// on the sheet but not the DB, in the DB but not the sheet, and matched-but-
// disagreeing. Writes nothing — the admin resolves conflicts by hand. Scoped to
// the current camp year (prior-year / imported campers live in the DB only by
// design and must not read as drift).
reconcileRouter.get('/admin/reconcile', requireAdmin, async (_req, res) => {
  try {
    const [sheetRows, dbCampers] = await Promise.all([
      getSheetValues('Registrations'),
      db
        .select({
          id: campers.id,
          firstName: campers.firstName,
          lastName: campers.lastName,
          email: campers.email,
          parentEmail: campers.parentEmail,
          grade: campers.grade,
          age: campers.age,
          gender: campers.gender,
          parentName: campers.parentName,
          parentPhone: campers.parentPhone,
          dob: campers.dob,
          tshirt: campers.tshirt,
          church: campers.church,
        })
        .from(campers)
        .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt))),
    ]);

    res.json(reconcileRegistrations(sheetRows, dbCampers, env.CAMP_YEAR));
  } catch (err) {
    console.error('reconcile error:', err);
    res.status(500).json({ error: 'Failed to reconcile the sheet with the database' });
  }
});
