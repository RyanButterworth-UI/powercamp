import { Router } from 'express';
import { appendToSheet } from '../services/sheets';

export const feedbackRouter = Router();

feedbackRouter.post('/feedback', async (req, res) => {
  console.log('Received feedback:', req.body);
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const row: string[] = [new Date().toISOString(), ...Object.values(body).map((v) => String(v ?? ''))];
    await appendToSheet('Feedback', row);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});
