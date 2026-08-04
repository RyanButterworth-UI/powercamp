import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { campers, feedback } from '../db/schema';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';
import { appendToSheet } from '../services/sheets';

export const feedbackRouter = Router();

// Normalised form of a typed camper name, used as the once-per-camper key.
// Lowercases, strips accents, collapses anything non-alphanumeric to single
// spaces. So "Timothy  Cable", "timothy cable" and "Tímothy Cable!" all key to
// "timothy cable" and the second submission is rejected.
export function nameKey(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// The form posts ratings as strings ('0'–'5'); accept numbers too so a
// non-browser client isn't gratuitously rejected.
const rating = z
  .union([z.string(), z.number()])
  .transform((v) => Number(v))
  .pipe(z.number().int().min(0).max(5));

// Optional free-text answer. `.nullish()` so a missing key and an explicit
// null are both fine (the Angular form sends ''), normalising every "nothing
// said here" shape to a single NULL in the column.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((s) => s || null);

const feedbackBody = z.object({
  camperName: z.string().trim().min(2).max(120),
  campOrganization: rating,
  spiritualInput: rating,
  activities: rating,
  facilities: rating,
  userComment: optionalText(4000),
  oneWord: optionalText(120),
  // 'Yes' | 'No' on the form. Optional here because the form's own
  // continue/submit gate doesn't include it, so blanks do reach us.
  requiresFeedback: z
    .string()
    .trim()
    .max(10)
    .nullish()
    .transform((s) => s ?? ''),
  additionalInfo: optionalText(4000),
});

// Best-effort match of a typed name against this year's register. Returns the
// camper id only when the name resolves to exactly ONE camper — an ambiguous
// or joint entry ("Abigail and Joshua Calitz") stays unmatched rather than
// being attributed to the wrong child. Tries the full name first, then falls
// back to a first-name-only match when that first name is unique this year.
async function matchCamperId(key: string): Promise<number | null> {
  const roster = await db
    .select({
      id: campers.id,
      firstName: campers.firstName,
      lastName: campers.lastName,
    })
    .from(campers)
    .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt)));

  const full = roster.filter(
    (c) => nameKey(`${c.firstName} ${c.lastName}`) === key
  );
  if (full.length === 1) return full[0].id;
  if (full.length > 1) return null;

  const firstOnly = roster.filter((c) => nameKey(c.firstName) === key);
  return firstOnly.length === 1 ? firstOnly[0].id : null;
}

feedbackRouter.post('/feedback', async (req, res) => {
  const parsed = feedbackBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid feedback submission' });
  }

  const body = parsed.data;
  const key = nameKey(body.camperName);
  if (!key) {
    return res.status(400).json({ error: 'Invalid feedback submission' });
  }

  const requiresFollowUp = /^y/i.test(body.requiresFeedback);

  try {
    const camperId = await matchCamperId(key);

    // onConflictDoNothing + returning() gives us the once-per-camper check and
    // the insert in one round trip: an empty result means the unique
    // (year, nameKey) index rejected it, i.e. this camper already responded.
    const [row] = await db
      .insert(feedback)
      .values({
        year: env.CAMP_YEAR,
        camperId,
        camperName: body.camperName,
        nameKey: key,
        campOrganization: body.campOrganization,
        spiritualInput: body.spiritualInput,
        activities: body.activities,
        facilities: body.facilities,
        userComment: body.userComment,
        oneWord: body.oneWord,
        requiresFollowUp,
        additionalInfo: body.additionalInfo,
      })
      .onConflictDoNothing({ target: [feedback.year, feedback.nameKey] })
      .returning();

    if (!row) {
      return res.status(409).json({
        error: 'already_submitted',
        camperName: body.camperName,
      });
    }

    // Mirror to the Feedback tab so the sheet stays the familiar read-only
    // view for people who live in it. Best-effort — the DB row is the source
    // of truth and a Sheets outage must not lose a camper's feedback. Fixed
    // column order (the old handler spread Object.values, so a form field
    // reorder silently shifted every column).
    try {
      await appendToSheet('Feedback', [
        new Date().toISOString(),
        body.camperName,
        body.campOrganization,
        body.spiritualInput,
        body.activities,
        body.facilities,
        body.userComment ?? '',
        body.oneWord ?? '',
        requiresFollowUp ? 'Yes' : 'No',
        body.additionalInfo ?? '',
      ]);
    } catch (sheetErr) {
      console.error('feedback sheet append failed (row saved):', sheetErr);
    }

    res.json({ ok: true, id: row.id, camperId });
  } catch (err) {
    console.error('feedback error:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

// Admin: every feedback response for the current camp year, plus the roll-up
// the team actually plans off — the four category averages, how many asked for
// follow-up, and which registered campers haven't responded yet.
feedbackRouter.get('/admin/feedback', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(feedback)
      .where(eq(feedback.year, env.CAMP_YEAR))
      .orderBy(desc(feedback.createdAt));

    const roster = await db
      .select({
        id: campers.id,
        firstName: campers.firstName,
        lastName: campers.lastName,
      })
      .from(campers)
      .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt)))
      .orderBy(campers.lastName, campers.firstName);

    const responded = new Set(
      rows.map((r) => r.camperId).filter((id): id is number => id !== null)
    );

    res.json({
      year: env.CAMP_YEAR,
      total: rows.length,
      feedback: rows,
      summary: {
        campOrganization: average(rows.map((r) => r.campOrganization)),
        spiritualInput: average(rows.map((r) => r.spiritualInput)),
        activities: average(rows.map((r) => r.activities)),
        facilities: average(rows.map((r) => r.facilities)),
        followUpRequested: rows.filter((r) => r.requiresFollowUp).length,
        registeredCampers: roster.length,
        // Campers with no response matched to their record. Approximate by
        // design: a joint or misspelt entry stays unmatched, so someone can
        // appear here despite having submitted. Treat it as a chase list, not
        // a ledger.
        awaiting: roster
          .filter((c) => !responded.has(c.id))
          .map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
      },
    });
  } catch (err) {
    console.error('admin/feedback error:', err);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});
