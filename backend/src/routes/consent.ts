import { Router } from 'express';
import { postToAppsScript } from '../services/sheets';

export const consentRouter = Router();

consentRouter.post('/consent', async (req, res) => {
  console.log('Received consent:', req.body);
  try {
    const result = await postToAppsScript(req.body, 'consent');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to forward data' });
  }
});
