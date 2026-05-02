import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { env } from '../env';
import { appendToSheet } from '../services/sheets';

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

type CamperInput = z.infer<typeof camperBody>;

// Column order MUST match the existing sheet so the Mailchimp Apps Script
// (processNewRows) keeps reading firstName from A, lastName from B,
// email from E, parentName from J, parentEmail from L.
function toSheetRow(d: CamperInput): (string | number | null)[] {
  return [
    d.firstName,                  // A
    d.lastName,                   // B
    d.camperCell ?? '',           // C
    d.gender ?? '',               // D
    d.email ?? '',                // E
    d.age ?? '',                  // F
    d.grade ?? '',                // G
    (d.friends ?? []).join(', '), // H
    d.medical ?? '',              // I
    d.parentName ?? '',           // J
    d.parentPhone ?? '',          // K
    d.parentEmail,                // L
    d.church ?? '',               // M
    d.tshirt ?? '',               // N
    d.generalInfo ?? '',          // O
    d.dob ?? '',                  // P
  ];
}

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

    appendToSheet('Registrations', toSheetRow(data)).catch((err) => {
      console.error('Sheet sync failed (DB write succeeded):', err);
    });

    res.json({ id: row.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register' });
  }
});
