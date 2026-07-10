import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../env';

const deleteGuard = z.object({ deletePassword: z.string().min(1).max(200) });

// Second-factor gate for the soft-delete endpoints. Runs AFTER requireAdmin,
// so the caller is already a signed-in admin; this proves they additionally
// know the delete password (DELETE_PASSWORD_HASH). Deliberately 403 rather
// than 401 so the client can tell "wrong delete password" apart from "your
// admin session expired" — requireAdmin owns 401.
export async function requireDeletePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const parsed = deleteGuard.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Delete password required' });
    return;
  }
  try {
    if (!(await bcrypt.compare(parsed.data.deletePassword, env.DELETE_PASSWORD_HASH))) {
      res.status(403).json({ error: 'Wrong delete password' });
      return;
    }
  } catch (err) {
    console.error('delete password check failed:', err);
    res.status(500).json({ error: 'Could not verify the delete password' });
    return;
  }
  next();
}
