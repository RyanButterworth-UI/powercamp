import jwt from 'jsonwebtoken';
import { env } from '../env';

const MAGIC_TTL_MIN = 30;

export interface MagicClaims {
  camperId: number;
  kind: 'magic';
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
