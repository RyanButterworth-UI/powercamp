import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { campers } from '../db/schema';
import { signMagicToken, signConsentLinkToken, verifyMagicTokenAllowingExpiry } from '../services/auth';
import { sendMagicLink, sendConsentRequest } from '../services/email';
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

const resendBody = z.object({
  token: z.string().min(10).max(2000),
});

// Family self-service: a parent whose consent link has EXPIRED lands on the
// dead-link screen and taps "email me a fresh one". We take the expired token,
// check its signature (so only links we issued work — ignoring that it's
// lapsed), pull the camper it points at, and re-issue a fresh 12-hour consent
// link to the parent email ON FILE. We never take an email from the request, so
// there's nothing to enumerate: an unknown/forged token just replies ok and
// sends nothing. Rate-limited alongside the other public form endpoints.
requestLinkRouter.post('/request-consent-resend', async (req, res) => {
  const parsed = resendBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const claims = verifyMagicTokenAllowingExpiry(parsed.data.token);
  // Always reply 200 — never reveal whether the token/camper is real.
  if (!claims) {
    return res.json({ ok: true });
  }

  try {
    const [camper] = await db.select().from(campers).where(eq(campers.id, claims.camperId));
    if (!camper || !camper.parentEmail || camper.deletedAt) {
      return res.json({ ok: true });
    }

    const url = `${env.APP_BASE_URL.replace(/\/$/, '')}/verify-link?token=${encodeURIComponent(
      signConsentLinkToken(camper.id)
    )}`;
    sendConsentRequest(camper.parentEmail, camper.firstName, url).catch((err) => {
      console.error('Failed to resend consent link:', err);
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('request-consent-resend error:', err);
    res.status(500).json({ error: 'Failed to resend the consent link' });
  }
});
