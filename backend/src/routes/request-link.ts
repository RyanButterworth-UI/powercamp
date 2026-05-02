import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { signMagicToken } from '../services/auth';
import { sendMagicLink } from '../services/email';
import { env } from '../env';

const requestBody = z.object({
  camperId: z.number().int().positive(),
});

export const requestLinkRouter = Router();

requestLinkRouter.post('/request-link', async (req, res) => {
  const parsed = requestBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const [camper] = await db
      .select()
      .from(campers)
      .where(eq(campers.id, parsed.data.camperId));

    // Always reply 200 — never reveal whether the camperId exists or has a usable email.
    if (!camper || !camper.parentEmail || camper.deletedAt) {
      return res.json({ ok: true });
    }

    const token = signMagicToken(camper.id);
    const url = `${env.APP_BASE_URL}/verify-link?token=${encodeURIComponent(token)}`;

    sendMagicLink(camper.parentEmail, camper.firstName, url).catch((err) => {
      console.error('Failed to send magic link:', err);
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('request-link error:', err);
    res.status(500).json({ error: 'Failed to send link' });
  }
});
