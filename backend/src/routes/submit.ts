import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { postToAppsScript } from '../services/sheets';

const camperBody = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  parentEmail: z.string().email(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  grade: z.string().optional(),
  email: z.string().optional(),
  camperCell: z.string().optional(),
  medical: z.string().optional(),
  tshirt: z.string().optional(),
  church: z.string().optional(),
  generalInfo: z.string().optional(),
  friends: z.array(z.string()).optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
});

export const submitRouter = Router();

submitRouter.post('/submit', async (req, res) => {
  const parsed = camperBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration', details: parsed.error.flatten() });
  }

  const data = parsed.data;
  console.log('Received registration:', data);

  try {
    const [row] = await db
      .insert(campers)
      .values({
        year: env.CAMP_YEAR,
        firstName: data.firstName,
        lastName: data.lastName,
        dob: data.dob,
        gender: data.gender,
        age: data.age,
        grade: data.grade,
        email: data.email?.toLowerCase(),
        camperCell: data.camperCell,
        medical: data.medical,
        tshirt: data.tshirt,
        church: data.church,
        generalInfo: data.generalInfo,
        friends: data.friends ?? [],
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail.toLowerCase(),
      })
      .returning({ id: campers.id });

    postToAppsScript(data, 'registration').catch((err) => {
      console.error('Sheet sync failed (DB write succeeded):', err);
    });

    res.json({ id: row.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register' });
  }
});
