import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { settings } from '../db/schema';

// The settings table is a singleton — one row, pinned to id 1. Centralising
// the id here keeps the read/write helpers in step.
const SETTINGS_ID = 1;

// Whether the public registration form is accepting new registrations.
// Defaults to OPEN when no row exists yet so a fresh database registers
// campers out of the box — the admin only ever has to act to *close* it.
export async function getRegistrationsOpen(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, SETTINGS_ID));
  return row ? row.registrationsOpen : true;
}

// Upserts the singleton row and returns the persisted value. Using an
// upsert (rather than update) means the first toggle works even before the
// row has been seeded.
export async function setRegistrationsOpen(open: boolean): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .insert(settings)
    .values({ id: SETTINGS_ID, registrationsOpen: open, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.id,
      set: { registrationsOpen: open, updatedAt: now },
    })
    .returning();
  return row.registrationsOpen;
}
