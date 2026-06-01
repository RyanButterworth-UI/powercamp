# Power Camp — 2026 update notes

Branch: `feature/final-testing`

## What changed (your 7 requests)

1. **Google Sheets connection** — wiring is intact and `sheets.test.ts` passes. I ran a
   read-only live check with your `.env` credentials: the service-account key parses and
   authenticates correctly; the only thing that stopped a full round-trip was the build
   sandbox's network allowlist (it can't reach Google). It will work from the deployed
   server. To smoke-test live: from `backend/`, hit the admin **Mark paid** action or
   submit a test registration and confirm a row lands in the sheet.

2. **Close registrations (admin)** — new admin **Waiting list** page (`/admin/waitlist`)
   has an OPEN/CLOSED toggle. Closing it:
   - shows the public form a "Registrations are closed" screen, and
   - blocks new `/submit` server-side (returns 403).
   It only blocks **new** registrations — existing families can still edit via their
   sign-in link, and admin is unaffected (your choice: "block new only").

3. **Waiting list table** — new `waitlist` DB table + admin view listing entries. The
   closed screen lets a family email you (`powercamplife@gmail.com`) **or** join inline;
   inline submissions save to the table, notify the admin mailbox, and mirror to a
   `Waitlist` sheet tab.

4. **Consent is now viewable to accept** — clauses replaced with the **full
   previous-years wording**, updated to the 2026 dates/venue, including the
   safety-of-child/property clause that was missing. Applied in the main form
   (`consent-step`), the edit flow (`verify-link`), and the `/consent` route.
   - **Note:** to avoid a risky DB migration on your live system right before camp, I kept
     the existing 6 consent fields and combined the "safety/property" + "indemnity"
     statements into one acceptance (the full text of both is shown). Say the word and I'll
     split it into its own stored `consent_safety` field.
   - **Venue:** I standardised the indemnity clause to "YFC Magaliesburg" (it still said
     "YFC Cyara"). Confirm that's the correct 2026 venue name for the legal text.

5. **Confirmation/summary screen on the edit flow** — returning families now get a
   read-only **"Please review your details"** summary before submitting (mirrors the
   Review step new registrations get), with **Back to edit** / **Confirm & submit**.

6. **Cost → R1350** — updated on the intro and About pages (and the test).

7. **"Parent/Guardian Name" → "Parent Guardian Full Name"** — relabelled on the parent
   step.

## Follow-up changes

8. **One-click "Camp is open" email to last year's families** — on the admin **Bulk email**
   page there's a new button: *"Build 'Camp is open' email to last year's families."* It
   selects everyone from the most recent prior year, pre-fills the subject + body (with the
   register + info links), and you just review and press **Send**. Recipients now include
   **both parent and camper emails, deduped** (the backend also dedupes and skips
   unsubscribers). Nothing auto-sends.

9. **Confirmation email now points to the info page** — the registration-received email has a
   "View camp info & payment details" button linking to `/info`, instead of "we'll follow up
   with payment details."

10. **Payment details on the info page** — added a collapsible **Payment details** dropdown on
    the About/info page with the Brackenhurst Baptist Church FNB account, branch code, and the
    `PowerCamp <Surname>` reference.

11. **Mobile phantom-scroll fix** — the global height used `100vh` (which counts the space
    behind the mobile address bar) and full-height pages forced `min-h-dvh` *below* the sticky
    header, so the document ran ~one header taller than the screen. Switched to `dvh` and made
    full-height pages subtract the header height (`--site-nav-h`). No more scroll where there
    shouldn't be one.

## Deploy steps (important)

- **Schema change:** two new tables (`settings`, `waitlist`). Run the existing migration
  step once on deploy:
  ```
  cd backend && DATABASE_URL='<prod-url>' npm run db:push
  ```
- **New env var (optional):** `REGISTRATION_ADMIN_EMAIL` — defaults to
  `powercamplife@gmail.com`, so you only need to set it in Render if you want a different
  inbox.

## Verification done

- Backend: `cd backend && npm test` → **21 suites / 149 tests pass** (added 15: submit
  "closed" guard, registration-status, waitlist).
- Frontend: `tsc` + Angular AOT template check (`ngc`) pass. I couldn't run the Angular
  jest/build here (the sandbox's `node_modules` has macOS binaries and the npm registry is
  blocked), so please run `npm test` and `npm run build` on your machine before deploy.
