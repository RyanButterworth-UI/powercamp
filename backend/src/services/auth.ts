import jwt from 'jsonwebtoken';
import { env } from '../env';

const MAGIC_TTL_MIN = 30;
const ADMIN_TTL_HR = 8;

export interface MagicClaims {
  camperId: number;
  kind: 'magic';
}

export interface AdminClaims {
  kind: 'admin';
}

export function signMagicToken(camperId: number): string {
  return jwt.sign({ camperId, kind: 'magic' }, env.JWT_SECRET, {
    expiresIn: `${MAGIC_TTL_MIN}m`,
  });
}

export function verifyMagicToken(token: string): MagicClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Partial<MagicClaims>;
    if (decoded?.kind !== 'magic' || typeof decoded.camperId !== 'number') return null;
    return { camperId: decoded.camperId, kind: 'magic' };
  } catch {
    return null;
  }
}

export function signAdminToken(): string {
  return jwt.sign({ kind: 'admin' }, env.JWT_SECRET, { expiresIn: `${ADMIN_TTL_HR}h` });
}

export function verifyAdminToken(token: string): AdminClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Partial<AdminClaims>;
    if (decoded?.kind !== 'admin') return null;
    return { kind: 'admin' };
  } catch {
    return null;
  }
}
