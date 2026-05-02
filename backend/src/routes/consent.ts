import { Router } from 'express';
import { appendToSheet } from '../services/sheets';

export const consentRouter = Router();

consentRouter.post('/consent', async (req, res) => {
  console.log('Received consent:', req.body);
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const row: string[] = [new Date().toISOString(), ...Object.values(body).map((v) => String(v ?? ''))];
    await appendToSheet('Consent', row);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});
