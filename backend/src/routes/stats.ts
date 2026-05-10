import { Router } from 'express';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { campers, leaders } from '../db/schema';
import { env } from '../env';

// Camp capacity is shared between campers and leaders. We cap at 150 to
// match the YFC Magaliesburg site limit + leader/camper ratio. If the cap
// ever changes we can lift it to an env var; until then, owning it in
// one place avoids drift between the home counter and any backend logic
// that needs the same number.
const CAMP_CAP = 150;

export const statsRouter = Router();

// Public endpoint — no PII, just counts. Powers the home-screen "X / 150
// spots filled" counter and the "space is limited" framing.
statsRouter.get('/stats', async (_req, res) => {
  try {
    const [{ camperCount }] = await db
      .select({ camperCount: sql<number>`count(*)::int` })
      .from(campers)
      .where(and(eq(campers.year, env.CAMP_YEAR), isNull(campers.deletedAt)));

    const [{ leaderCount }] = await db
      .select({ leaderCount: sql<number>`count(*)::int` })
      .from(leaders)
      .where(and(eq(leaders.year, env.CAMP_YEAR), isNull(leaders.deletedAt)));

    const total = camperCount + leaderCount;
    res.json({
      year: env.CAMP_YEAR,
      campers: camperCount,
      leaders: leaderCount,
      total,
      cap: CAMP_CAP,
      remaining: Math.max(0, CAMP_CAP - total),
    });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});
