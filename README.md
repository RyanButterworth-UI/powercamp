# Power Camp registration app

Angular 19 frontend + Express/TypeScript backend for camper and leader
registration, magic-link verification, and an admin console (campers,
leaders, teams, bunks, bulk email).

## Stack

- **Frontend:** Angular 19 + Tailwind, standalone components, signals.
- **Backend:** Express on `tsx` (no compile step), Drizzle ORM against Neon Postgres.
- **Email:** Nodemailer + Gmail SMTP (app password).
- **Sheets:** Google Sheets API write-through after each DB commit.
- **Tests:** Jest (`npm test`) for the Angular side, Jest + supertest
  (`cd backend && npm test`) for the API. Playwright (`npx playwright test`)
  for end-to-end browser flows.
- **Deploy:** Render web service via `render.yaml`; the backend serves
  both the JSON API and the compiled Angular app on the same origin.
  See [DEPLOY.md](./DEPLOY.md).

## Local setup

Requires Node 20.

```bash
# install root + backend deps
npm install
cd backend && npm install && cd ..

# copy + fill in env vars
cp backend/.env.example backend/.env
# edit backend/.env with your DATABASE_URL, JWT_SECRET, GMAIL_USER,
# GMAIL_APP_PASSWORD, ADMIN_PASSWORD_HASH, LEADER_PASSWORD_HASH,
# NEIL_PASSWORD_HASH, GOOGLE_SHEET_ID + service account creds.

# apply the Drizzle schema to your DB
cd backend && npm run db:push && cd ..
```

Generate the bcrypt hashes you'll need:

```bash
cd backend
npm run hash:admin-password -- '<admin-password>'
npm run hash:admin-password -- '<leader-password>'
npm run hash:admin-password -- '<neil-password>'
```

## Running

Two processes in two terminals:

```bash
# frontend at http://localhost:4200, proxies /api to backend
npm start

# backend at http://localhost:3000
cd backend && npm run dev
```

## Tests

```bash
npm test                  # Angular Jest specs
cd backend && npm test    # API Jest specs
npx playwright test       # Playwright e2e
```

## Useful scripts

- `cd backend && npm run import:2025 -- ./assets/<file>.xlsx` — one-shot
  import of last year's registrations into the DB.
- `cd backend && npm run seed:random` — populates random campers/leaders
  for poking at the admin views.
- `cd backend && npm run db:push` — apply schema changes via Drizzle.

## Repo layout

```
src/                          Angular app
  app/
    admin/                    /admin/* console (login, dashboard, leaders,
                              teams, bunks, bulk-email, guard, service)
    form/                     multi-step camper registration form
    lookup/                   landing page + camper search
    verify-link/              magic-link callback
    leader-apply/             leader application flow
    leader-register/          post-invite leader registration
backend/
  src/
    routes/                   express routers (admin, submit, lookup,
                              leaders, request-link, verify-link, update,
                              consent, feedback, unsubscribe, stats)
    services/                 email, sheets, auth, subscriptions
    db/                       Drizzle schema + client
    middleware/               require-admin
    __tests__/                Jest specs
  scripts/                    import-2025, seed-random, hash-admin-password
e2e/                          Playwright specs
```
