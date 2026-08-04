-- Hardens "one response per camper".
--
-- The original unique index was on (year, name_key), where name_key was
-- whatever the visitor TYPED. So the same camper could answer twice under two
-- spellings — "Lexi" and "Lexi Butterworth" are different strings, so the index
-- saw two different people. The route now resolves every submission to the
-- REGISTERED name before writing name_key, and this index closes the gap for
-- anyone we managed to tie to an actual camper record.
--
-- Partial (WHERE camper_id IS NOT NULL) because camper_id is deliberately NULL
-- for leaders and for names two campers share — those rows still rely on the
-- name_key index alone.
--
-- ORDER MATTERS: run step 1, look at what it prints, and only run step 2 once
-- it returns nothing. Creating the index while duplicates exist will fail.

-- ---------------------------------------------------------------------------
-- Step 1: are there already duplicates? (read-only)
-- ---------------------------------------------------------------------------
SELECT camper_id,
       count(*)                      AS responses,
       array_agg(id ORDER BY created_at) AS row_ids,
       array_agg(camper_name ORDER BY created_at) AS names_used
FROM feedback
WHERE camper_id IS NOT NULL
GROUP BY camper_id
HAVING count(*) > 1;

-- ---------------------------------------------------------------------------
-- Step 2: only if step 1 returned NOTHING.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS feedback_year_camper_uidx
  ON feedback (year, camper_id)
  WHERE camper_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- If step 1 DID return rows, decide what to keep before creating the index.
-- This keeps the EARLIEST response per camper and deletes the rest. It is
-- destructive and deliberately left commented out — read the step 1 output,
-- satisfy yourself the extras really are duplicates, then run it by hand.
-- ---------------------------------------------------------------------------
-- DELETE FROM feedback f
-- USING (
--   SELECT camper_id, min(created_at) AS keep_at
--   FROM feedback
--   WHERE camper_id IS NOT NULL
--   GROUP BY camper_id
--   HAVING count(*) > 1
-- ) d
-- WHERE f.camper_id = d.camper_id
--   AND f.created_at > d.keep_at;
