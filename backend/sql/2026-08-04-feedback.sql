-- Post-camp feedback. Until now the /feedback form only appended to the
-- "Feedback" tab of the Google Sheet, so nothing was queryable and the same
-- camper could submit any number of times. This table makes the DB the source
-- of truth (the sheet append stays as a best-effort mirror) and enforces the
-- "each camper can only fill it once" rule.
--
-- Identity is the NORMALISED NAME, not a foreign key. The form takes a
-- free-text camper name and families routinely cover siblings in one entry
-- ("Abigail and Joshua Calitz" in the 2024 responses), so a hard FK would
-- reject real submissions. Instead:
--   • name_key  — lowercased, accent-stripped, punctuation-collapsed name.
--                 The UNIQUE (year, name_key) index is what blocks a second
--                 submission for the same camper.
--   • camper_id — best-effort soft match against this year's register, set
--                 when the typed name resolves to exactly one camper and left
--                 NULL otherwise. Used for admin reporting only; nothing
--                 depends on it being populated.
--
-- Run straight on the Neon DB. Safe to re-run: every statement is guarded.

CREATE TABLE IF NOT EXISTS feedback (
  id                serial PRIMARY KEY,
  year              integer NOT NULL,
  camper_id         integer,
  camper_name       text NOT NULL,
  name_key          text NOT NULL,
  -- The four 0-5 scores, in the order the form asks them.
  camp_organization integer NOT NULL,
  spiritual_input   integer NOT NULL,
  activities        integer NOT NULL,
  facilities        integer NOT NULL,
  user_comment      text,
  one_word          text,
  requires_follow_up boolean NOT NULL DEFAULT false,
  additional_info   text,
  created_at        timestamp NOT NULL DEFAULT now()
);

-- The once-per-camper-per-year constraint.
CREATE UNIQUE INDEX IF NOT EXISTS feedback_year_name_key_uidx
  ON feedback (year, name_key);

CREATE INDEX IF NOT EXISTS feedback_year_idx   ON feedback (year);
CREATE INDEX IF NOT EXISTS feedback_camper_idx ON feedback (camper_id);
