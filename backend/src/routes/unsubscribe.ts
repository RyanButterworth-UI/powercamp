import { Router } from 'express';
import { z } from 'zod';
import { verifyUnsubscribeToken } from '../services/auth';
import { unsubscribeByEmail } from '../services/subscriptions';

const body = z.object({ token: z.string().min(10).max(2000) });

export const unsubscribeRouter = Router();

unsubscribeRouter.post('/unsubscribe', async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

  const claims = verifyUnsubscribeToken(parsed.data.token);
  if (!claims) return res.status(401).json({ error: 'Invalid or expired link' });

  try {
    await unsubscribeByEmail(claims.email);
    res.json({ ok: true, email: claims.email });
  } catch (err) {
    console.error('unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});
