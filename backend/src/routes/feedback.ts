import { Router } from 'express';
import { postToAppsScript } from '../services/sheets';

export const feedbackRouter = Router();

feedbackRouter.post('/feedback', async (req, res) => {
  console.log('Received feedback:', req.body);
  try {
    const result = await postToAppsScript(req.body, 'feedback');
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to forward data' });
  }
});
