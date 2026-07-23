-- Extends the waiting list into a FULL registration record: the same camper
-- detail + consent columns a camper carries. This lets a family complete
-- everything (including consent) when they JOIN the waiting list, and makes
-- moving BETWEEN the waiting list and the main list lossless in both
-- directions (promote camper<-waitlist, and demote camper->waitlist).
--
-- Run straight on the Neon DB. Safe to re-run: IF NOT EXISTS makes each column
-- a no-op the second time. Every column is nullable, so existing waiting-list
-- rows keep NULL for the new fields — which the code treats as "not captured"
-- (and the promote flow then falls back to emailing a consent request).
--
-- Unchanged (already exist): camper_name, parent_name, parent_email, phone,
-- grade, note, status, year, created_at, deleted_at.

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS first_name                 text,
  ADD COLUMN IF NOT EXISTS last_name                  text,
  ADD COLUMN IF NOT EXISTS dob                        text,
  ADD COLUMN IF NOT EXISTS gender                     text,
  ADD COLUMN IF NOT EXISTS age                        text,
  ADD COLUMN IF NOT EXISTS email                      text,
  ADD COLUMN IF NOT EXISTS camper_cell                text,
  ADD COLUMN IF NOT EXISTS medical                    text,
  ADD COLUMN IF NOT EXISTS tshirt                     text,
  ADD COLUMN IF NOT EXISTS church                     text,
  ADD COLUMN IF NOT EXISTS general_info               text,
  ADD COLUMN IF NOT EXISTS friends                    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consent_general            text,
  ADD COLUMN IF NOT EXISTS consent_location           text,
  ADD COLUMN IF NOT EXISTS consent_risk               text,
  ADD COLUMN IF NOT EXISTS consent_power_camp         text,
  ADD COLUMN IF NOT EXISTS consent_behaviour          text,
  ADD COLUMN IF NOT EXISTS consent_photo              text,
  ADD COLUMN IF NOT EXISTS consent_emergency_name     text,
  ADD COLUMN IF NOT EXISTS consent_emergency_contact  text,
  ADD COLUMN IF NOT EXISTS consent_medical_aid_name   text,
  ADD COLUMN IF NOT EXISTS consent_medical_aid_number text,
  ADD COLUMN IF NOT EXISTS consent_date               text,
  ADD COLUMN IF NOT EXISTS consent_accepted_at        timestamp;
