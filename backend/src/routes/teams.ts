import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  teams,
  teamAssignments,
  bunks,
  bunkAssignments,
  campers,
  leaders,
} from '../db/schema';
import { env } from '../env';
import { requireAdmin } from '../middleware/require-admin';

export const teamsRouter = Router();

// =====================================================================
// Teams
// =====================================================================

// Returns every team for the current year + a flat list of assignments
// (camperId → teamId). The frontend joins these with the camper roster
// it already has via /admin/campers, so no PII duplication.
teamsRouter.get('/admin/teams', requireAdmin, async (_req, res) => {
  try {
    const teamRows = await db.select().from(teams).where(eq(teams.year, env.CAMP_YEAR));
    const assignmentRows = await db
      .select({
        camperId: teamAssignments.camperId,
        teamId: teamAssignments.teamId,
      })
      .from(teamAssignments)
      .where(eq(teamAssignments.year, env.CAMP_YEAR));
    res.json({ teams: teamRows, assignments: assignmentRows });
  } catch (err) {
    console.error('teams/list error:', err);
    res.status(500).json({ error: 'Failed to load teams' });
  }
});

const createTeamBody = z.object({
  name: z.string().min(1).max(60),
  color: z.string().min(1).max(20).optional(),
  captainLeaderId: z.number().int().positive().nullable().optional(),
});

teamsRouter.post('/admin/teams', requireAdmin, async (req, res) => {
  const parsed = createTeamBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  try {
    const [row] = await db
      .insert(teams)
      .values({
        year: env.CAMP_YEAR,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        captainLeaderId: parsed.data.captainLeaderId ?? null,
      })
      .returning();
    res.json({ team: row });
  } catch (err) {
    console.error('teams/create error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Bulk assignment save. The FE sends every camper-team pair from its
// current state — easier to reason about than per-pair PATCH calls.
// Empty teamId means "remove from any team". Idempotent.
//
// MUST be declared BEFORE the /:id update route — Express matches
// routes in order, so /admin/teams/assignments would otherwise be
// captured by /admin/teams/:id with id="assignments" and 400 out as
// "Invalid team id".
const saveAssignmentsBody = z.object({
  assignments: z.array(
    z.object({
      camperId: z.number().int().positive(),
      teamId: z.number().int().positive().nullable(),
    })
  ),
});

teamsRouter.post('/admin/teams/assignments', requireAdmin, async (req, res) => {
  const parsed = saveAssignmentsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  try {
    await db.transaction(async (tx) => {
      // Wipe + reinsert is simpler and safer than computing diffs. The
      // table is small (≤ 150 rows per year) so the cost is trivial.
      await tx.delete(teamAssignments).where(eq(teamAssignments.year, env.CAMP_YEAR));
      const rows = parsed.data.assignments.filter((a) => a.teamId !== null) as Array<{
        camperId: number;
        teamId: number;
      }>;
      if (rows.length > 0) {
        await tx.insert(teamAssignments).values(
          rows.map((a) => ({
            year: env.CAMP_YEAR,
            camperId: a.camperId,
            teamId: a.teamId,
          }))
        );
      }
    });
    res.json({ ok: true, count: parsed.data.assignments.filter((a) => a.teamId !== null).length });
  } catch (err) {
    console.error('teams/assignments error:', err);
    res.status(500).json({ error: 'Failed to save assignments' });
  }
});

const updateTeamBody = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z.string().min(1).max(20).nullable().optional(),
  captainLeaderId: z.number().int().positive().nullable().optional(),
});

teamsRouter.post('/admin/teams/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid team id' });
  }
  const parsed = updateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  try {
    const patch: Partial<typeof teams.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.color !== undefined) patch.color = parsed.data.color;
    if (parsed.data.captainLeaderId !== undefined) patch.captainLeaderId = parsed.data.captainLeaderId;
    const [row] = await db.update(teams).set(patch).where(eq(teams.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'Team not found' });
    res.json({ team: row });
  } catch (err) {
    console.error('teams/update error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

teamsRouter.delete('/admin/teams/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid team id' });
  }
  try {
    await db.delete(teamAssignments).where(eq(teamAssignments.teamId, id));
    const [row] = await db.delete(teams).where(eq(teams.id, id)).returning({ id: teams.id });
    if (!row) return res.status(404).json({ error: 'Team not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('teams/delete error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// =====================================================================
// Bunks
// =====================================================================

teamsRouter.get('/admin/bunks', requireAdmin, async (_req, res) => {
  try {
    const bunkRows = await db.select().from(bunks).where(eq(bunks.year, env.CAMP_YEAR));
    const assignmentRows = await db
      .select({
        camperId: bunkAssignments.camperId,
        bunkId: bunkAssignments.bunkId,
      })
      .from(bunkAssignments)
      .where(eq(bunkAssignments.year, env.CAMP_YEAR));
    res.json({ bunks: bunkRows, assignments: assignmentRows });
  } catch (err) {
    console.error('bunks/list error:', err);
    res.status(500).json({ error: 'Failed to load bunks' });
  }
});

const createBunkBody = z.object({
  name: z.string().min(1).max(60),
  gender: z.enum(['Male', 'Female']),
  leaderId: z.number().int().positive().nullable().optional(),
});

teamsRouter.post('/admin/bunks', requireAdmin, async (req, res) => {
  const parsed = createBunkBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  try {
    // If a leader is named, sanity-check the gender matches — single-
    // gender bunks are a safeguarding requirement.
    if (parsed.data.leaderId) {
      const [leader] = await db
        .select()
        .from(leaders)
        .where(eq(leaders.id, parsed.data.leaderId));
      if (!leader) return res.status(400).json({ error: 'Leader not found' });
      if (leader.gender && leader.gender !== parsed.data.gender) {
        return res.status(400).json({
          error: `Leader gender (${leader.gender}) does not match bunk gender (${parsed.data.gender}).`,
        });
      }
    }
    const [row] = await db
      .insert(bunks)
      .values({
        year: env.CAMP_YEAR,
        name: parsed.data.name,
        gender: parsed.data.gender,
        leaderId: parsed.data.leaderId ?? null,
      })
      .returning();
    res.json({ bunk: row });
  } catch (err) {
    console.error('bunks/create error:', err);
    res.status(500).json({ error: 'Failed to create bunk' });
  }
});

// Bulk bunk-assignment save — same shape and reasoning as
// /admin/teams/assignments. MUST be declared BEFORE /admin/bunks/:id
// so Express doesn't match "assignments" as a :id param.
const saveBunkAssignmentsBody = z.object({
  assignments: z.array(
    z.object({
      camperId: z.number().int().positive(),
      bunkId: z.number().int().positive().nullable(),
    })
  ),
});

teamsRouter.post('/admin/bunks/assignments', requireAdmin, async (req, res) => {
  const parsed = saveBunkAssignmentsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  try {
    await db.transaction(async (tx) => {
      // Sanity-check: a camper can only land in a bunk that matches
      // their gender. Read camper genders + bunk genders and reject
      // mismatches before wiping anything.
      const camperRows = await tx
        .select({ id: campers.id, gender: campers.gender })
        .from(campers)
        .where(and(eq(campers.year, env.CAMP_YEAR)));
      const bunkRows = await tx.select({ id: bunks.id, gender: bunks.gender }).from(bunks);
      const camperGender = new Map(camperRows.map((c) => [c.id, c.gender]));
      const bunkGender = new Map(bunkRows.map((b) => [b.id, b.gender]));
      for (const a of parsed.data.assignments) {
        if (a.bunkId == null) continue;
        const cg = camperGender.get(a.camperId);
        const bg = bunkGender.get(a.bunkId);
        if (cg && bg && cg !== bg) {
          throw new Error(
            `Camper ${a.camperId} (${cg}) cannot be in bunk ${a.bunkId} (${bg}).`
          );
        }
      }

      await tx.delete(bunkAssignments).where(eq(bunkAssignments.year, env.CAMP_YEAR));
      const rows = parsed.data.assignments.filter((a) => a.bunkId !== null) as Array<{
        camperId: number;
        bunkId: number;
      }>;
      if (rows.length > 0) {
        await tx.insert(bunkAssignments).values(
          rows.map((a) => ({
            year: env.CAMP_YEAR,
            camperId: a.camperId,
            bunkId: a.bunkId,
          }))
        );
      }
    });
    res.json({ ok: true, count: parsed.data.assignments.filter((a) => a.bunkId !== null).length });
  } catch (err) {
    console.error('bunks/assignments error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to save bunk assignments',
    });
  }
});

const updateBunkBody = z.object({
  name: z.string().min(1).max(60).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  leaderId: z.number().int().positive().nullable().optional(),
});

teamsRouter.post('/admin/bunks/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid bunk id' });
  }
  const parsed = updateBunkBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }
  try {
    const patch: Partial<typeof bunks.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.gender !== undefined) patch.gender = parsed.data.gender;
    if (parsed.data.leaderId !== undefined) patch.leaderId = parsed.data.leaderId;
    const [row] = await db.update(bunks).set(patch).where(eq(bunks.id, id)).returning();
    if (!row) return res.status(404).json({ error: 'Bunk not found' });
    res.json({ bunk: row });
  } catch (err) {
    console.error('bunks/update error:', err);
    res.status(500).json({ error: 'Failed to update bunk' });
  }
});

teamsRouter.delete('/admin/bunks/:id', requireAdmin, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid bunk id' });
  }
  try {
    await db.delete(bunkAssignments).where(eq(bunkAssignments.bunkId, id));
    const [row] = await db.delete(bunks).where(eq(bunks.id, id)).returning({ id: bunks.id });
    if (!row) return res.status(404).json({ error: 'Bunk not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('bunks/delete error:', err);
    res.status(500).json({ error: 'Failed to delete bunk' });
  }
});
