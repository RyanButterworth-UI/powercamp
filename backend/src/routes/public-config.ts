import { Router } from 'express';
import { env } from '../env';

// Public, read-only config the frontend needs at runtime. Anything here
// is visible to anyone hitting the site — never put secrets through it.
//
// Currently surfaces:
//   • leaderApplicationEmail — where leader applicants should email
//     their motivation. Drives both the displayed mailto link and
//     (separately) the backend's notification destination, so changing
//     NEIL_EMAIL in Render env updates them together.
export const publicConfigRouter = Router();

publicConfigRouter.get('/public-config', (_req, res) => {
  res.json({
    leaderApplicationEmail: env.NEIL_EMAIL ?? env.GMAIL_USER,
    campYear: env.CAMP_YEAR,
  });
});
