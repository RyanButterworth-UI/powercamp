import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { campers, feedback, leaders } from '../db/schema';
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

export interface RosterPerson {
  id: number;
  firstName: string;
  lastName: string;
  kind: 'camper' | 'leader';
}

// Everyone who was at camp this year. Leaders are included so the team can give
// feedback too — they were there, and excluding them would just push them into
// typing a camper's name.
async function loadRoster(): Promise<RosterPerson[]> {
  const [camperRows, leaderRows] = await Promise.all([
    db
      .select({
        id: campers.id,
        firstName: campers.firstName,
        lastName: campers.lastName,
      })
      .from(campers)
      .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt))),
    db
      .select({
        id: leaders.id,
        firstName: leaders.firstName,
        lastName: leaders.lastName,
      })
      .from(leaders)
      .where(and(eq(leaders.year, env.CAMP_YEAR), isNull(leaders.deletedAt))),
  ]);

  return [
    ...camperRows.map((r) => ({ ...r, kind: 'camper' as const })),
    ...leaderRows.map((r) => ({ ...r, kind: 'leader' as const })),
  ];
}

// Matches a typed name against the register. Two separate answers:
//   • found    — the name belongs to someone who was at camp. This is the spam
//                gate: no match, no submission.
//   • camperId — resolved to exactly ONE camper, for reporting. Null when the
//                name is a leader, or when two campers share it; the response
//                still counts, it just isn't attributed to a record.
// Full name first, then a first-name-only match when that first name is unique.
export interface RosterMatch {
  found: boolean;
  camperId: number | null;
  // The matched person's REGISTERED name, normalised. This — not what the
  // visitor typed — is what the once-per-camper index keys on, so "Lexi" and
  // "Lexi Butterworth" collapse to the same person instead of buying a second
  // go at the form. Null when nothing matched.
  canonicalKey: string | null;
}

export function matchRoster(key: string, roster: RosterPerson[]): RosterMatch {
  const canonicalOf = (p: RosterPerson) =>
    nameKey(`${p.firstName} ${p.lastName}`);

  const full = roster.filter((p) => canonicalOf(p) === key);
  if (full.length > 0) {
    const matchedCampers = full.filter((p) => p.kind === 'camper');
    return {
      found: true,
      camperId: matchedCampers.length === 1 ? matchedCampers[0].id : null,
      canonicalKey: canonicalOf(full[0]),
    };
  }

  const firstOnly = roster.filter((p) => nameKey(p.firstName) === key);
  if (firstOnly.length === 1) {
    return {
      found: true,
      camperId: firstOnly[0].kind === 'camper' ? firstOnly[0].id : null,
      canonicalKey: canonicalOf(firstOnly[0]),
    };
  }

  return { found: false, camperId: null, canonicalKey: null };
}

// Has this person already had their say? Checks the canonical name key and,
// when we resolved an actual camper, their id too — belt and braces, because
// rows written before canonical keys existed are keyed on whatever was typed.
async function hasAlreadySubmitted(
  key: string,
  camperId: number | null = null
): Promise<boolean> {
  const rows = await db
    .select({ id: feedback.id, nameKey: feedback.nameKey, camperId: feedback.camperId })
    .from(feedback)
    .where(eq(feedback.year, env.CAMP_YEAR));

  return rows.some(
    (r) => r.nameKey === key || (camperId !== null && r.camperId === camperId)
  );
}

// Typeahead behind the name field: "is this you?". Given at least three
// characters it offers matching people from this year's register, each flagged
// with whether they've already had their say, so the camper picks their
// registered spelling instead of guessing at it.
//
// PRIVACY: this is the one endpoint that hands out names from the register to
// an unauthenticated caller, and most of those names belong to minors. It's
// deliberately fenced in — three characters minimum, prefix matches only (so a
// single letter returns nothing), at most 8 results, and its own rate limit —
// which makes walking it to harvest the roster slow and noisy. Grade is
// included because it's what separates two campers with the same name; no
// contact details are ever returned. If you'd rather not publish names at all,
// the /feedback/check-name endpoint below does the same job blind.
const SUGGESTION_LIMIT = 8;
const SUGGEST_MIN_CHARS = 3;

feedbackRouter.post('/feedback/suggest', async (req, res) => {
  const parsed = z
    .object({ q: z.string().trim().min(1).max(120) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query' });
  }

  const key = nameKey(parsed.data.q);
  if (key.length < SUGGEST_MIN_CHARS) {
    return res.json({ suggestions: [] });
  }

  try {
    const [roster, takenKeys] = await Promise.all([
      loadRoster(),
      db
        .select({ nameKey: feedback.nameKey })
        .from(feedback)
        .where(eq(feedback.year, env.CAMP_YEAR)),
    ]);
    const taken = new Set(takenKeys.map((r) => r.nameKey));

    // Prefix matches on the full name, the first name or the surname. Prefix
    // rather than substring so "an" can't sweep up every name containing it.
    const matches = roster.filter((p) => {
      const full = nameKey(`${p.firstName} ${p.lastName}`);
      return (
        full.startsWith(key) ||
        nameKey(p.firstName).startsWith(key) ||
        nameKey(p.lastName).startsWith(key)
      );
    });

    res.json({
      suggestions: matches.slice(0, SUGGESTION_LIMIT).map((p) => {
        const name = `${p.firstName} ${p.lastName}`;
        return {
          name,
          kind: p.kind,
          alreadySubmitted: taken.has(nameKey(name)),
        };
      }),
    });
  } catch (err) {
    console.error('feedback suggest error:', err);
    res.status(500).json({ error: 'Failed to search the camp list' });
  }
});

// Live check behind the name field. Answers the two things the form needs to
// know before someone fills in the rest: is this a real name from camp, and
// have they already had their say? Returns booleans only — no names, no contact
// details — and is rate limited so it can't be walked through at speed.
feedbackRouter.post('/feedback/check-name', async (req, res) => {
  const parsed = z
    .object({ camperName: z.string().trim().min(1).max(120) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid name' });
  }

  const key = nameKey(parsed.data.camperName);
  if (!key) return res.json({ found: false, alreadySubmitted: false });

  try {
    const match = matchRoster(key, await loadRoster());
    // Keyed on the REGISTERED name, so typing a short form of a name that has
    // already responded is still reported as already responded.
    const alreadySubmitted = match.found
      ? await hasAlreadySubmitted(match.canonicalKey!, match.camperId)
      : false;
    res.json({ found: match.found, alreadySubmitted });
  } catch (err) {
    console.error('feedback check-name error:', err);
    res.status(500).json({ error: 'Failed to check the name' });
  }
});

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
    // The spam gate: feedback is only accepted from someone who was actually at
    // camp. Enforced here rather than only in the browser so it can't be
    // bypassed by posting straight at the endpoint.
    const { found, camperId, canonicalKey } = matchRoster(
      key,
      await loadRoster()
    );
    if (!found || !canonicalKey) {
      return res.status(422).json({
        error: 'unknown_camper',
        camperName: body.camperName,
      });
    }

    // Explicit duplicate check before the insert. The unique index below is the
    // race backstop, but it only sees name_key — this also catches the same
    // camper coming back under a different spelling, and any row written before
    // keys were canonicalised.
    if (await hasAlreadySubmitted(canonicalKey, camperId)) {
      return res.status(409).json({
        error: 'already_submitted',
        camperName: body.camperName,
      });
    }

    // onConflictDoNothing + returning() gives us the once-per-camper check and
    // the insert in one round trip: an empty result means the unique
    // (year, nameKey) index rejected it, i.e. this camper already responded.
    const [row] = await db
      .insert(feedback)
      .values({
        year: env.CAMP_YEAR,
        camperId,
        camperName: body.camperName,
        // The registered spelling, not the typed one — see RosterMatch.
        nameKey: canonicalKey,
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

    // Contact details come along so the admin can act on a follow-up request
    // without going back to the Campers list to look the family up.
    const roster = await db
      .select({
        id: campers.id,
        firstName: campers.firstName,
        lastName: campers.lastName,
        grade: campers.grade,
        email: campers.email,
        camperCell: campers.camperCell,
        parentName: campers.parentName,
        parentEmail: campers.parentEmail,
        parentPhone: campers.parentPhone,
      })
      .from(campers)
      .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt)))
      .orderBy(campers.lastName, campers.firstName);

    const byId = new Map(roster.map((c) => [c.id, c]));
    const responded = new Set(
      rows.map((r) => r.camperId).filter((id): id is number => id !== null)
    );

    res.json({
      year: env.CAMP_YEAR,
      total: rows.length,
      feedback: rows.map((r) => ({
        ...r,
        // Null when the typed name didn't resolve to a single camper — a
        // leader, a joint entry, or a name shared by two campers.
        camper: r.camperId ? (byId.get(r.camperId) ?? null) : null,
      })),
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
