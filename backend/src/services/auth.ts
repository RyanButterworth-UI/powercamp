import jwt from 'jsonwebtoken';
import { env } from '../env';

const MAGIC_TTL_MIN = 30;
const ADMIN_TTL_HR = 8;
// Leaders have a longer window — Neil might invite a leader on a Sunday
// and not see them follow up till midweek. 7 days hits the right balance:
// long enough to forget about briefly, short enough that a stale token
// in someone's inbox isn't an indefinite ticket into the system.
const LEADER_INVITE_TTL_DAYS = 7;

export interface MagicClaims {
  camperId: number;
  kind: 'magic';
}

export interface AdminClaims {
  kind: 'admin';
}

// A short-lived capability granted after an admin re-enters the inline-edit
// password (EDITOR_PASSWORD_HASH). It rides ALONGSIDE the admin token rather
// than replacing it: the admin session proves "you may see this page", the
// editor token proves "you, specifically, unlocked editing this session".
// Same TTL as the admin session so the two expire together and a single
// browser-tab close clears both.
export interface EditorClaims {
  kind: 'editor';
}

export interface LeaderInviteClaims {
  leaderId: number;
  kind: 'leader-invite';
}

export function signMagicToken(camperId: number): string {
  return jwt.sign({ camperId, kind: 'magic' }, env.JWT_SECRET, {
    expiresIn: `${MAGIC_TTL_MIN}m`,
  });
}

// A consent-request link. Same 'magic' kind as a self-serve sign-in link — so it
// verifies through the identical edit/consent form (verifyMagicToken) — but with
// a much longer life. An admin sends this deliberately and the parent may not
// open their inbox for hours; a 30-minute link would often be dead on arrival.
const CONSENT_LINK_TTL_HR = 12;
export function signConsentLinkToken(camperId: number): string {
  return jwt.sign({ camperId, kind: 'magic' }, env.JWT_SECRET, {
    expiresIn: `${CONSENT_LINK_TTL_HR}h`,
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

export function signEditorToken(): string {
  return jwt.sign({ kind: 'editor' }, env.JWT_SECRET, { expiresIn: `${ADMIN_TTL_HR}h` });
}

export function verifyEditorToken(token: string): EditorClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Partial<EditorClaims>;
    if (decoded?.kind !== 'editor') return null;
    return { kind: 'editor' };
  } catch {
    return null;
  }
}

// Long-lived (1y) — unsubscribe links don't expire from a UX perspective.
// The token itself just identifies the email; flipping subscribed=false is
// idempotent so replay attacks are harmless.
export function signUnsubscribeToken(email: string): string {
  return jwt.sign({ email: email.trim().toLowerCase(), kind: 'unsubscribe' }, env.JWT_SECRET, {
    expiresIn: '365d',
  });
}

export function verifyUnsubscribeToken(token: string): { email: string } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { email?: string; kind?: string };
    if (decoded?.kind !== 'unsubscribe' || typeof decoded.email !== 'string') return null;
    return { email: decoded.email };
  } catch {
    return null;
  }
}

export function signLeaderInviteToken(leaderId: number): string {
  return jwt.sign({ leaderId, kind: 'leader-invite' }, env.JWT_SECRET, {
    expiresIn: `${LEADER_INVITE_TTL_DAYS}d`,
  });
}

export function verifyLeaderInviteToken(token: string): LeaderInviteClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Partial<LeaderInviteClaims>;
    if (decoded?.kind !== 'leader-invite' || typeof decoded.leaderId !== 'number') return null;
    return { leaderId: decoded.leaderId, kind: 'leader-invite' };
  } catch {
    return null;
  }
}
