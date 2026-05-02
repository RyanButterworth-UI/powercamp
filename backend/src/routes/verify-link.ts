import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { verifyMagicToken } from '../services/auth';

const verifyBody = z.object({
  token: z.string().min(10).max(2000),
});

export const verifyLinkRouter = Router();

verifyLinkRouter.post('/verify-link', async (req, res) => {
  const parsed = verifyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const claims = verifyMagicToken(parsed.data.token);
  if (!claims) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }

  try {
    const [camper] = await db
      .select()
      .from(campers)
      .where(eq(campers.id, claims.camperId));

    if (!camper || camper.deletedAt) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({
      camper: {
        id: camper.id,
        year: camper.year,
        firstName: camper.firstName,
        lastName: camper.lastName,
        email: camper.email,
        camperCell: camper.camperCell,
        gender: camper.gender,
        age: camper.age,
        grade: camper.grade,
        friends: camper.friends ?? [],
        medical: camper.medical,
        parentName: camper.parentName,
        parentPhone: camper.parentPhone,
        parentEmail: camper.parentEmail,
        church: camper.church,
        tshirt: camper.tshirt,
        generalInfo: camper.generalInfo,
        dob: camper.dob,
      },
    });
  } catch (err) {
    console.error('verify-link error:', err);
    res.status(500).json({ error: 'Failed to verify' });
  }
});
