-- Adds soft-delete support to the waiting list, matching campers.deleted_at
-- and leaders.deleted_at (which already existed).
--
-- Run straight on the Neon DB. Safe to re-run: IF NOT EXISTS makes it a no-op
-- the second time. Nothing is backfilled — every existing row keeps
-- deleted_at = NULL, i.e. "not deleted", which is what the read filters expect.

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS deleted_at timestamp;

-- To undo a mistaken delete (any of the three tables):
--   UPDATE waitlist SET deleted_at = NULL WHERE id = <id>;
--   UPDATE campers  SET deleted_at = NULL WHERE id = <id>;
--   UPDATE leaders  SET deleted_at = NULL WHERE id = <id>;
