import { Router } from 'express';
import { z } from 'zod';
import { and, ilike, isNull, or, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';

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
    const rows = await db
      .select({
        id: campers.id,
        firstName: campers.firstName,
        lastName: campers.lastName,
        year: campers.year,
        parentEmail: campers.parentEmail,
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

    const results = rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      year: r.year,
      parentEmailMasked: maskEmail(r.parentEmail),
    }));

    res.json({ results });
  } catch (err) {
    console.error('Lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});
