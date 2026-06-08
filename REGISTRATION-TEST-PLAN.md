# Power Camp — Pre-Launch Test Plan (Camper + Leader registration)

Goal: prove camper registration and leader registration are bombproof before tonight's deploy.
Teams and bunks are **out of scope** — skip them.

Work top to bottom. **Step 0 is your safety net — run it first.** If the automated suites are
green, the manual scripts below are mostly confirming the wiring you can't unit-test (real emails,
real Google Sheet rows, real browser behaviour).

---

## Step 0 — Run the automated suites first (5 min, catches 80%)

```bash
# from repo root
npm test                       # Angular Jest specs
cd backend && npm test         # API specs — should be 21 suites / 149 tests
npx playwright test            # end-to-end browser flows
cd ..
npm run build                  # prod build must succeed — CHANGES note says run this on YOUR machine
```

Pass criteria: all three green, build completes with no errors.
If `npm test` or `npm run build` fails, **stop and fix before touching the manual steps** — the
CHANGES note flagged that these couldn't be run in the build sandbox, so this is the first time
they're running on a real machine.

---

## Step 1 — Environment sanity (do once, before any manual testing)

- [ ] Backend is running and reachable (`cd backend && npm run dev`, hits `http://localhost:3000`).
- [ ] Frontend is running (`npm start`, `http://localhost:4200`).
- [ ] `GET /api/registration-status` returns `{ "registrationsOpen": true, ... }`.
- [ ] `GET /api/public-config` returns the correct `leaderApplicationEmail` (this is Neil's address
      that applicants are told to email).
- [ ] DB schema is applied (`cd backend && npm run db:push`) — the 2026 update added `settings` and
      `waitlist` tables; registration close + waitlist won't work without them.

> Tip: test against a **test DB / test Google Sheet** if you can, so you're not seeding junk rows
> into the live sheet right before launch. The README lists `npm run seed:random` and
> `npm run wipe-test-data` if you want to reset.

---

## Step 2 — Camper registration — happy path (the Lexi test, formalised)

Open `http://localhost:4200` in a **fresh/incognito window** (so no old draft is in localStorage).

1. [ ] Lookup screen loads, shows the capacity widget ("X of Y spots booked").
2. [ ] Click through to start a new registration (Intro → Camper).
3. [ ] Fill every step with valid data:
   - Camper: first name, last name
   - Details: gender, age, DOB, grade
   - Friends: add one or two (optional)
   - Medical: leave blank or add a note
   - Parent: name, phone (SA mobile `0XXXXXXXXX`), email
   - T-shirt + church
   - Other info (optional)
4. [ ] **Review** step shows everything you typed, accurately.
5. [ ] **Consent** step: tick all 6 statements, fill emergency name + number, medical aid name +
      number (or tick "We're not on medical aid").
6. [ ] Submit. Loader spins, then the **success dialog** appears with the camper's first name.
7. [ ] **Confirm the registration landed everywhere:**
   - [ ] Row in the DB `campers` table (or admin dashboard `/admin`).
   - [ ] Row in the Google Sheet **Registrations** tab, columns in the right order
         (A firstName, B lastName, E camper email, J parentName, L parentEmail, Q = `TRUE`).
   - [ ] "Registration received" **email arrives** at the parent email, and its "View camp info &
         payment details" button links to `/info`.
   - [ ] On the `/info` page, the **Payment details** dropdown shows the FNB account + the
         `PowerCamp <Surname>` reference.

---

## Step 3 — Camper registration — the edge cases that actually break things

These hit the validation guards and the draft/consent logic, which is where vibe-coded forms rot.

- [ ] **Required-field gating:** try to advance past a step with a required field empty — the
      stepper should keep the next step **locked** (it unlocks only as far as you've filled in).
- [ ] **Bad phone number:** enter `12345` for parent phone — must be rejected (pattern is SA mobile
      `0[6-8]XXXXXXXX`). Same for camper cell *if* you fill it (camper cell is optional but
      pattern-checked when present).
- [ ] **Bad email:** `notanemail` for parent email — rejected. Parent email is **required**;
      camper's own email is **optional** (leaving it blank must still submit fine).
- [ ] **Consent can't be skipped:** on the Consent step, leave one box unticked → Submit must be
      blocked.
- [ ] **Draft survives a reload, consent does NOT:** fill in half the form, refresh the page.
   - [ ] Your typed data is restored and you land back on the furthest completed step.
   - [ ] The 6 consent checkboxes are **back to unticked** (by design — they must be re-agreed every
         submit). Verify you can't somehow submit with stale consent.
- [ ] **"Register another child":** after a successful submit, click it. Parent name/phone/email are
      **kept**; all camper fields and all consent boxes are **cleared**. Submit the second child and
      confirm a second distinct row appears.
- [ ] **"Reset / start over":** confirm the dialog, confirm it wipes the draft and returns to Lookup.
- [ ] **Double-submit:** click Submit, then try clicking again while the loader is up — should not
      create two rows.
- [ ] **Backend down:** stop the backend, submit — you should get the **error** dialog, and your
      draft should still be in localStorage (data not lost).

---

## Step 4 — Edit an existing registration (magic-link flow)

This path is **not** blocked when registrations close, so test it independently.

1. [ ] Trigger a sign-in link for an existing camper (Lookup → search name → request link, or
      whatever your request-link entry point is).
2. [ ] Magic-link email arrives; open it → lands on `/verify-link`.
3. [ ] Form is **pre-filled** with the existing camper's details, including prior consent.
4. [ ] Change a field (e.g. t-shirt size).
5. [ ] The new **"Please review your details"** read-only summary appears before submit, with
      **Back to edit** / **Confirm & submit**.
6. [ ] Confirm → DB row is updated (not duplicated), and the change mirrors to the sheet.
7. [ ] **Expired/invalid token:** hit `/verify-link?token=garbage` → friendly "invalid or expired"
      message, no crash.

---

## Step 5 — Leader registration — full lifecycle (apply → approve → invite → register)

This is a 4-stage loop. Test the whole chain, not just the apply form.

### 5a. Apply
1. [ ] Go to `/leader-apply`.
2. [ ] **Screening gate — rejection path:** answer "No" to either question → you see the polite
      "we regret to inform you…" screen and **nothing is POSTed** (check backend logs / DB: no new
      leader row).
3. [ ] **Change my answer** returns you to screening; answer **Yes / Yes** → application form shows.
4. [ ] Submit with a blank required field → inline "Please fill in: …" list appears, no POST.
5. [ ] Submit valid name + email → "Application received" screen, telling them to email Neil.
6. [ ] Confirm: new row in `leaders` table with `status = pending`; row in Sheet **Leaders** tab;
      **Neil gets the "new leader application" notification email**.

### 5b. Approve (admin)
7. [ ] Log in to `/admin/leaders`. The pending leader is listed.
8. [ ] Approve them → status flips to `approved`.

### 5c. Invite
9. [ ] Send the invite (`/admin/leaders/:id/invite` action). Confirm the **leader receives an invite
      email** with a `/leader-register?token=...` link.
   - [ ] Sanity: you should **not** be able to invite a leader who is still `pending`
        (server returns "Leader must be approved before they can be invited").

### 5d. Register
10. [ ] Open the invite link → `/leader-register` verifies the token and shows
       "Welcome, {name}" pre-filled with what's already known.
11. [ ] Fill cell, gender, age, church, t-shirt, emergency contact → **Confirm my registration** →
       "Registration complete".
12. [ ] DB leader row is updated with those details and tagged with the current camp year.

### 5e. Leader invite edge cases
- [ ] **No token:** open `/leader-register` with no `?token=` → "No invite token in the URL" message.
- [ ] **Bad/expired token:** `/leader-register?token=garbage` → "invalid or expired" message.
- [ ] **Not-approved token:** if you can get a token for a non-approved leader, verify it returns the
      "isn't approved yet" message rather than letting them in.

---

## Step 6 — Registration close + waitlist (you added this in 2026 — test it)

1. [ ] In `/admin/waitlist`, flip the toggle to **CLOSED**.
2. [ ] Reload the public form (`/`) → the **"Registrations are closed"** screen shows instead of the
      form, with the waitlist email.
3. [ ] Confirm a new `POST /submit` is **blocked with 403** server-side (try submitting via the UI;
      it should not create a camper row).
4. [ ] Join the waitlist inline → entry lands in the `waitlist` table, admin is notified, and it
      mirrors to the **Waitlist** sheet tab.
5. [ ] **Existing families can still edit:** with registrations CLOSED, run the Step 4 magic-link
      edit flow again — it must still work (close blocks NEW only).
6. [ ] Flip back to **OPEN**, reload `/`, confirm the form returns.
7. [ ] **Fail-open check:** the status endpoint is designed to fail OPEN — if the DB read hiccups it
      returns `registrationsOpen: true`. You don't need to simulate a DB outage, just know that
      "closed" depends on the DB being reachable.

---

## Step 7 — Final pre-deploy gate

- [ ] Re-read the **Deploy steps** in `CHANGES-2026-update.md`: run `db:push` against the **prod**
      `DATABASE_URL` once (creates `settings` + `waitlist`), and set `REGISTRATION_ADMIN_EMAIL` in
      Render only if you want a non-default inbox.
- [ ] Confirm the legal text venue name is correct — CHANGES flagged it was standardised to
      **"YFC Magaliesburg"** (was "YFC Cyara"). Make sure that's the real 2026 venue.
- [ ] Confirm the **cost shows R1350** on the intro and info pages.
- [ ] Do **one real end-to-end submit on the deployed Render URL** after deploy (not just localhost),
      and confirm the row reaches the live Google Sheet — the sheet round-trip could not be tested in
      the build sandbox, so the deployed server is the first real proof.

---

### Where things are most likely to bite (watch these)
- **Google Sheet column order** — the sheet is read by column position. If a row lands
  with shifted columns, the sheet sync is the suspect, not the DB.
- **Consent re-tick on resume** — by design consent is never restored from draft; make sure that
  doesn't trap a parent who reloads (they just re-tick, but verify it's not silently blocking submit).
- **Emails are best-effort** — the code logs and moves on if Gmail hiccups, so a missing email does
  **not** mean the registration failed. Always confirm the DB/sheet row, then the email separately.
- **Leader register has no required fields** on the final step — a leader could confirm with blanks.
  Decide if that's acceptable before launch.
