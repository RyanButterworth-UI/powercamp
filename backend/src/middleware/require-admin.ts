import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/auth';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorised' });
    return;
  }
  next();
}
