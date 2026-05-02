import { Router } from 'express';
import { postToAppsScript } from '../services/sheets';

export const submitRouter = Router();

submitRouter.post('/submit', async (req, res) => {
  console.log('Received registration:', req.body);
  try {
    const result = await postToAppsScript(req.body, 'registration');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to forward data' });
  }
});
