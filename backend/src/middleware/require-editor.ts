import type { Request, Response, NextFunction } from 'express';
import { verifyEditorToken } from '../services/auth';

// Second-factor gate for inline editing. Runs AFTER requireAdmin, so the
// caller is already a logged-in admin; this proves they additionally unlocked
// editing this session by re-entering EDITOR_PASSWORD_HASH (only Ryan + Shayln
// know it). The editor token is sent in its own header so it never collides
// with the admin Bearer token in Authorization.
export function requireEditor(req: Request, res: Response, next: NextFunction): void {
  const header =
    req.header('x-editor-token') ?? req.header('X-Editor-Token') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : header.trim();
  if (!token || !verifyEditorToken(token)) {
    res.status(403).json({ error: 'Editing is locked — unlock with the edit password.' });
    return;
  }
  next();
}
