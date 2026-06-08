import { Router } from 'express';
import { z } from 'zod';
import { and, ilike, isNull, or, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { campers, leaders } from '../db/schema';

const lookupBody = z.object({
  q: z.string().trim().min(1).max(100),
});

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain || !local) return '***';
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export const lookupRouter = Router();

lookupRouter.post('/lookup', async (req, res) => {
  const parsed = lookupBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query' });
  }
  const pattern = `%${parsed.data.q}%`;

  try {
    // Search BOTH campers and leaders so a returning person of either kind
    // recognises themselves. `kind` lets the frontend route each result to the
    // right re-registration path: campers get a magic-link edit; leaders go
    // back through the (open) leader application, pre-filled with their name.
    const camperRows = await db
      .select({
        id: campers.id,
        firstName: campers.firstName,
        lastName: campers.lastName,
        year: campers.year,
        email: campers.parentEmail,
      })
      .from(campers)
      .where(
        and(
          isNull(campers.deletedAt),
          or(ilike(campers.firstName, pattern), ilike(campers.lastName, pattern))
        )
      )
      .orderBy(desc(campers.year), campers.lastName, campers.firstName)
      .limit(50);

    const leaderRows = await db
      .select({
        id: leaders.id,
        firstName: leaders.firstName,
        lastName: leaders.lastName,
        year: leaders.year,
        email: leaders.email,
      })
      .from(leaders)
      .where(
        and(
          isNull(leaders.deletedAt),
          or(ilike(leaders.firstName, pattern), ilike(leaders.lastName, pattern))
        )
      )
      .orderBy(desc(leaders.year), leaders.lastName, leaders.firstName)
      .limit(50);

    const results = [
      ...camperRows.map((r) => ({ ...r, kind: 'camper' as const })),
      ...leaderRows.map((r) => ({ ...r, kind: 'leader' as const })),
    ]
      // Most-recent year first, then alphabetical — same ordering as before.
      .sort(
        (a, b) =>
          b.year - a.year ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName)
      )
      .slice(0, 50)
      .map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        year: r.year,
        kind: r.kind,
        // Masked email — parent's for a camper, the leader's own for a leader.
        parentEmailMasked: maskEmail(r.email),
      }));

    res.json({ results });
  } catch (err) {
    console.error('Lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});
