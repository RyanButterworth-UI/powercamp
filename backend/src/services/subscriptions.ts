import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { subscriptions } from '../db/schema';
import { appendToSheet } from './sheets';

const norm = (e: string) => e.trim().toLowerCase();

// Sheet column order for the Subscriptions tab:
// A timestamp, B email, C action (subscribed | unsubscribed), D source.
function logToSheet(email: string, action: 'subscribed' | 'unsubscribed', source: string): void {
  appendToSheet('Subscriptions', [
    new Date().toISOString(),
    email,
    action,
    source,
  ]).catch((err) => {
    // Best-effort. Sheet failures never block subscription writes.
    console.error('Subscription sheet sync failed:', err);
  });
}

/** Idempotently record this email as a subscriber. Existing rows aren't
 *  flipped back to subscribed=true if they had unsubscribed earlier — we
 *  treat unsubscribe as final unless an admin re-enables manually. */
export async function ensureSubscription(email: string, source = 'registration'): Promise<void> {
  if (!email) return;
  const e = norm(email);
  const result = await db
    .insert(subscriptions)
    .values({ email: e, subscribed: true, source })
    .onConflictDoNothing({ target: subscriptions.email })
    .returning({ id: subscriptions.id });
  // Only log a fresh subscribe to the sheet — silent no-op when the row
  // already existed (returning() comes back empty for conflict-do-nothing).
  if (result.length > 0) {
    logToSheet(e, 'subscribed', source);
  }
}

/** Returns the unsubscribed-or-missing emails removed from the list, leaving
 *  only addresses we're allowed to email. Missing rows are treated as opted
 *  in (legacy data — every imported camper hadn't gone through the new
 *  registration flow yet). */
export async function filterToSubscribed(emails: string[]): Promise<{
  allowed: string[];
  skipped: string[];
}> {
  if (emails.length === 0) return { allowed: [], skipped: [] };
  const lowered = emails.map(norm);

  const rows = await db
    .select({ email: subscriptions.email, subscribed: subscriptions.subscribed })
    .from(subscriptions)
    .where(inArray(subscriptions.email, lowered));

  const status = new Map(rows.map((r) => [r.email, r.subscribed]));
  const allowed: string[] = [];
  const skipped: string[] = [];
  for (const e of lowered) {
    if (status.get(e) === false) skipped.push(e);
    else allowed.push(e);
  }
  return { allowed, skipped };
}

export async function unsubscribeByEmail(email: string): Promise<{ updated: boolean }> {
  if (!email) return { updated: false };
  const e = norm(email);
  // Upsert: if no row exists yet, create one already-unsubscribed.
  const result = await db
    .insert(subscriptions)
    .values({ email: e, subscribed: false, unsubscribedAt: new Date(), source: 'self' })
    .onConflictDoUpdate({
      target: subscriptions.email,
      set: { subscribed: false, unsubscribedAt: new Date(), updatedAt: new Date() },
    })
    .returning({ id: subscriptions.id });
  if (result.length > 0) logToSheet(e, 'unsubscribed', 'self');
  return { updated: result.length > 0 };
}

export async function setSubscribed(email: string, subscribed: boolean): Promise<void> {
  if (!email) return;
  const e = norm(email);
  await db
    .insert(subscriptions)
    .values({
      email: e,
      subscribed,
      unsubscribedAt: subscribed ? null : new Date(),
      source: 'admin',
    })
    .onConflictDoUpdate({
      target: subscriptions.email,
      set: {
        subscribed,
        unsubscribedAt: subscribed ? null : new Date(),
        updatedAt: new Date(),
      },
    });
  logToSheet(e, subscribed ? 'subscribed' : 'unsubscribed', 'admin');
}

export async function listSubscriptions() {
  return db
    .select()
    .from(subscriptions)
    .orderBy(sql`${subscriptions.subscribed} DESC, ${subscriptions.email} ASC`);
}
