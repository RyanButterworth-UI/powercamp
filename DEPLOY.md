# Deploying Power Camp to Render

This is the operator checklist for getting the app onto Render. The codebase
is already wired up — what's left is provisioning, secrets, and a few
dashboard clicks.

## Architecture recap

A single Render web service runs the Express backend (`/backend`), which
serves both the JSON API routes and the compiled Angular frontend
(`backend/dist/powercamp/browser`) as static files. There is no separate
frontend service.

External dependencies:

- A Postgres database (Neon or Render Postgres).
- A Google service account with access to the camp's Google Sheet.
- A Gmail account with an app password for sending magic-link emails.

## 1 — Provision the Postgres database

Pick one:

**Option A: Neon (recommended — matches `.env.example`)**

1. Create a project at https://neon.tech.
2. Copy the connection string from *Connection Details*. Make sure it ends
   with `?sslmode=require`.

**Option B: Render Postgres**

1. In Render: *New → PostgreSQL*. Pick the same region as the web service
   (Frankfurt is closest to South Africa).
2. Copy the *Internal Database URL* (faster, free egress) for `DATABASE_URL`.

## 2 — Push the schema

From your local machine, with the production DB URL:

```bash
cd backend
DATABASE_URL='<paste-prod-url>' npm run db:push
```

This applies the Drizzle schema. Re-run after any schema change.

## 3 — Generate production secrets

Run these locally and keep the outputs handy — you'll paste them into the
Render dashboard in step 5.

```bash
# JWT signing secret
openssl rand -hex 32

# Admin, leader, and Neil password hashes
cd backend
npm run hash:admin-password -- '<your-admin-password>'
npm run hash:admin-password -- '<your-leader-password>'
npm run hash:admin-password -- '<neils-password>'
```

> **Rotate the Neil password before this deploy.** A previous hardcoded
> literal (`gravelROx`) lived in `backend/src/routes/admin.ts` for months
> and remains in git history — anyone with repo read access has seen it.
> Pick a fresh password and hash it for `NEIL_PASSWORD_HASH`.

You'll also need:

- A Gmail app password — generate at https://myaccount.google.com/apppasswords
  (requires 2-Step Verification on the Gmail account).
- A Google service account JSON key with Sheets API access. Share the target
  spreadsheet with the service account email (Editor). Note the email and the
  full private key (preserve the `\n` escapes when pasting).

## 4 — Create the service in Render

1. *New → Blueprint* → connect your `RyanButterworth-UI/powercamp` GitHub repo.
2. Render reads `render.yaml` and prompts you to fill in every env var marked
   `sync: false`. Paste the values from step 3 (and your `DATABASE_URL` from
   step 1).
3. Click *Apply*. Render starts the first build.

## 5 — Update URL-dependent env vars

Once the service is live, you'll know its URL (something like
`https://powercamp.onrender.com`, or whatever you named it).

Update these in *Environment* tab if they don't match:

- `APP_BASE_URL` — the public Angular URL (used to build magic-link emails).
- `ALLOWED_ORIGINS` — comma-separated CORS allowlist. Include your custom
  domain if you add one later.

Trigger a *Manual Deploy → Clear build cache & deploy* so the new vars take
effect.

## 6 — Smoke-test

- `https://<your-url>/healthz` → should return `{"status":"ok"}`.
- `https://<your-url>/` → Angular app loads.
- Submit a test registration end-to-end — confirms DB writes, Sheets writes,
  and email delivery all work.

## 7 — (Optional) Custom domain

In Render: *Settings → Custom Domains → Add*. Render gives you DNS records
to add at your registrar. Once verified, update `APP_BASE_URL` and
`ALLOWED_ORIGINS` to the new domain (keep the `.onrender.com` URL in
`ALLOWED_ORIGINS` if you still want it accessible).

## Cleanup notes

- `backend/dist/` is now gitignored. The currently-committed copy will keep
  working, but you can clean it up with:
  ```bash
  git rm -r --cached backend/dist
  git commit -m "stop tracking build output"
  ```
- Free-tier services spin down after ~15 minutes of inactivity. First request
  after a cold start takes ~30s. If that's a problem, upgrade to *Starter*.

## Troubleshooting

**Build fails at `ng build`** → likely missing root devDeps. Confirm the
build command is `npm run render-build` (which now does `npm install` first).

**Build succeeds, server crashes at boot with "Invalid environment configuration"**
→ Zod validation in `backend/src/env.ts` failed. Check the Render logs — it
prints exactly which env vars are missing or malformed.

**Magic-link emails never arrive** → confirm Gmail app password (not the
account password), and that 2FA is enabled on the Gmail account.

**CORS errors in the browser** → `ALLOWED_ORIGINS` doesn't include the URL
the browser is loading from. Add it (comma-separated) and redeploy.
