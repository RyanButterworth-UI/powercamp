import { Router } from 'express';
import { env } from '../env';
import { getRegistrationsOpen } from '../services/settings';

// Public, unauthenticated. Drives the registration form's open/closed state
// and the closed-screen "email us to join the waiting list" address. Kept
// separate from /public-config so reading the DB-backed flag here doesn't
// couple that (env-only, synchronous) endpoint to the database.
export const registrationStatusRouter = Router();

registrationStatusRouter.get('/registration-status', async (_req, res) => {
  try {
    const registrationsOpen = await getRegistrationsOpen();
    res.json({ registrationsOpen, waitlistEmail: env.REGISTRATION_ADMIN_EMAIL });
  } catch (err) {
    console.error('registration-status error:', err);
    // Fail OPEN: a transient DB hiccup must never silently block families
    // from registering. The admin can still explicitly close.
    res.json({ registrationsOpen: true, waitlistEmail: env.REGISTRATION_ADMIN_EMAIL });
  }
});
