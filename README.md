# Ledgard

Ledgard is a single-ledger family finance web application. It is designed as a self-hosted PWA on Cloudflare with one isolated app/database per family.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, PWA.
- Backend: Hono on Cloudflare Workers.
- Database: Cloudflare D1 SQLite.
- Hosting: Cloudflare Workers Assets.
- Auth: Cloudflare Access in production, `DEV_USER_EMAIL` fallback only in local development.
- Local orchestration: Govard.

## Main Features

- Liquidity-first dashboard: available cash first, net worth second.
- Accounts: cash, bank, credit card, savings.
- Transaction ledger: income, expense, transfer, loan, debt, debt collection, repayment.
- Category hierarchy: strict parent -> child.
- Shared and individual monthly budgets.
- Period locking through D1 triggers.
- Scheduled recurring transactions via Worker cron.
- English default UI, Vietnamese supported in Settings.
- Currency setting for common currencies: `USD`, `VND`, `EUR`, `GBP`, `JPY`, `SGD`, `AUD`, `CAD`.

## Project Layout

```text
migrations/              D1 schema, triggers, seed data
src/client/              React app
src/worker/              Hono Worker API and cron handler
src/shared/              Shared types and finance utilities
tests/                   Unit tests
design/                  Design system and generated prototypes
docs/                    Product specification and implementation plan
wrangler.toml            Cloudflare Worker/D1/Assets config
.govard.yml              Govard local environment config
.govard/                 Govard project overrides
```

Planning documents:

- [docs/SPECS.md](docs/SPECS.md)
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Local Setup

Requirements:

- Govard installed and configured
- Docker running

Govard runs two services:

- `web`: Vite frontend on port `80`
- `worker`: Wrangler Worker API on port `8787`

The Vite dev server proxies `/api` to `http://worker:8787` through `LEDGARD_API_PROXY_TARGET`.

### Setup Steps

1. Start shared Govard services:

```bash
govard svc up
```

2. Install dependencies:

```bash
govard tool npm install
```

3. Start the project:

```bash
govard up
```

4. Apply local D1 migrations:

```bash
govard env exec worker npm run db:migrate:local
```

5. Open the app:

```text
https://ledgard.test/
```

Health check:

```text
https://ledgard.test/api/health
```

### Common Govard Commands

```bash
govard ps                    # Check service status
govard logs -f               # Follow logs
govard restart               # Restart services
govard down                  # Stop services
govard diag --fix            # Fix common issues
govard env cleanup           # Clean up Docker resources
```

### Troubleshooting

If the browser reports an SSL or `.test` DNS problem:

```bash
govard svc up
govard doctor trust
```

If a port or Docker resource is stuck:

```bash
govard diag --fix
govard env cleanup
```

## Authentication Model

There is no app-owned password login.

**Local development (Govard):**

- Worker uses `DEV_USER_EMAIL` from `.dev.vars`
- Maps the request to a local member (default: `admin@ledgard.local`)
- This fallback is disabled when `ENVIRONMENT=production`

**Production:**

- Cloudflare Access protects the app hostname
- Cloudflare Access injects `CF-Access-Authenticated-User-Email`
- Worker maps that email to `members.email`
- If the email is not in `members`, API returns `403`

## Database

Local migrations (inside Govard):

```bash
govard env exec worker npm run db:migrate:local
```

Remote migrations (production):

```bash
npm run db:migrate:remote
```

Schema files:

- [migrations/0001_initial_schema.sql](migrations/0001_initial_schema.sql)
- [migrations/0002_triggers_indexes.sql](migrations/0002_triggers_indexes.sql)
- [migrations/0003_seed_defaults.sql](migrations/0003_seed_defaults.sql)

Period lock:

- `system_settings.global_lock_until_date` controls the lock date.
- D1 triggers block `INSERT`, `UPDATE`, and `DELETE` for transactions dated on or before that date.

## Production Deployment On Cloudflare

This app is designed to run as a single Cloudflare Worker with bundled static assets and one D1 database.

Production requirements:

- Cloudflare account.
- A Cloudflare-managed domain or subdomain, for example `ledger.example.com`.
- Cloudflare Zero Trust enabled for Access authentication.
- Wrangler login on the machine that deploys.
- A production admin email that will be allowed by Cloudflare Access and seeded into `members`.

### 1. Login To Cloudflare

Authenticate Wrangler:

```bash
npx wrangler login
```

Confirm the active Cloudflare account:

```bash
npx wrangler whoami
```

### 2. Create Production D1

Create the D1 database:

```bash
npx wrangler d1 create ledgard-db
```

Copy the generated `database_id` into [wrangler.toml](wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "ledgard-db"
database_id = "YOUR_REAL_DATABASE_ID"
```

`wrangler.toml` should be committed because it defines the Worker entrypoint, bindings, assets, and cron. Do not commit secrets in it.

### 3. Confirm Production Vars

Production vars in [wrangler.toml](wrangler.toml) should be:

```toml
[vars]
ENVIRONMENT = "production"
DEFAULT_LOCALE = "en"
DEFAULT_CURRENCY = "USD"
```

Do not set `DEV_USER_EMAIL` in production.

If production needs a different default currency, set `DEFAULT_CURRENCY` before first deploy or update it later in Settings.

### 4. Install, Test, And Build

Use `npm ci` for clean production installs:

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

### 5. Apply Remote D1 Migrations

Apply schema, triggers, indexes, and seed defaults to the remote D1 database:

```bash
npm run db:migrate:remote
```

Verify the remote tables exist:

```bash
npx wrangler d1 execute ledgard-db --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

### 6. Seed The First Admin

Seed the first production admin member. Replace `you@example.com` and `Family Admin`:

```bash
npx wrangler d1 execute ledgard-db --remote --command "INSERT INTO members (id, name, email, role, is_active) VALUES ('mem-admin-prod', 'Family Admin', 'you@example.com', 'admin', 1) ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = 'admin', is_active = 1;"
```

For a real family bootstrap, you may keep a private local seed file such as `seeds/production_vi.sql` and run it from the deploying machine:

```bash
npx wrangler d1 execute ledgard-db --remote --file seeds/production_vi.sql
```

Do not push production seed files to git when they contain real family emails, account names, or private defaults. `.gitignore` excludes `seeds/production*.sql`.

Confirm the admin exists:

```bash
npx wrangler d1 execute ledgard-db --remote --command "SELECT id, name, email, role, is_active FROM members;"
```

### 7. Deploy Worker And Assets

Deploy:

```bash
npm run deploy
```

Wrangler will upload:

- Worker API from `src/worker/index.ts`.
- Static assets from `dist/client`.
- Cron trigger from `wrangler.toml`.
- D1 binding named `DB`.

### 8. Configure Custom Domain Or Route

In Cloudflare Dashboard, attach the Worker to the production hostname, for example:

```text
ledger.example.com
```

Recommended path:

1. Cloudflare Dashboard -> Workers & Pages -> `ledgard`.
2. Settings -> Domains & Routes.
3. Add a custom domain such as `ledger.example.com`.
4. Wait until the domain is active.

### 9. Configure Cloudflare Access

Configure Cloudflare Access after the Worker custom domain exists:

1. Cloudflare Dashboard -> Zero Trust -> Access -> Applications.
2. Add a Self-hosted application.
3. Use the same hostname as the Worker custom domain, for example `ledger.example.com`.
4. Add an allow policy for family member emails.
5. Use OTP/magic-link authentication.
6. Make sure each allowed email also exists in the `members` table.

Important: Cloudflare Access must sit in front of the same hostname users open in the browser. The app itself has no password login.

### 10. Verify Production

Open the health endpoint:

```text
https://ledger.example.com/api/health
```

Expected response:

```json
{"data":{"ok":true,"service":"ledgard","timestamp":"..."}}
```

Open the app:

```text
https://ledger.example.com/
```

Expected behavior:

- Browser is redirected to Cloudflare Access login if not authenticated.
- After OTP login, the dashboard loads.
- If the authenticated email is not present in `members`, API returns `403`.

### 11. Add More Family Members

After the first admin can access the app, add members through Settings or seed them through D1:

```bash
npx wrangler d1 execute ledgard-db --remote --command "INSERT INTO members (id, name, email, role, is_active) VALUES ('mem-member-1', 'Family Member', 'member@example.com', 'member', 1) ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, is_active = 1;"
```

Also add the same email to the Cloudflare Access allow policy.

### 12. Production Updates

For normal updates:

```bash
git pull
npm ci
npm run typecheck
npm run test
npm run build
npm run db:migrate:remote
npm run deploy
```

Before destructive schema changes, export or backup D1 first:

```bash
npx wrangler d1 export ledgard-db --remote --output ledgard-backup.sql
```

### 13. Rollback Notes

Cloudflare Workers keeps deployment versions in the dashboard. If a deploy breaks the app:

1. Cloudflare Dashboard -> Workers & Pages -> `ledgard`.
2. Deployments.
3. Roll back to the last known-good deployment.
4. Do not roll back D1 schema without a matching backup plan.

### 14. Deployment Troubleshooting Notes

Common issues:

**Permission errors during deployment:**

If `npm ci` fails with `EACCES` due to Govard-generated files owned by `root`:

```bash
govard env exec web sh -lc 'chown -R 1000:1000 /app/node_modules /app/.wrangler 2>/dev/null || true'
npm ci
```

**D1 migration issues:**

- D1 remote migrations can fail with `incomplete input` when trigger bodies use multi-line `SELECT CASE ... THEN RAISE(...) END`. Use the shorter form:

```sql
SELECT RAISE(ABORT, 'MESSAGE')
WHERE condition;
```

- D1 remote SQL file execution rejects explicit `BEGIN TRANSACTION`, `COMMIT`, and `SAVEPOINT` statements. Do not wrap seed files in manual transactions.

**Authentication issues:**

- The production Worker URL may return `401 Missing Cloudflare Access identity` until Cloudflare Access is configured. `/api/health` remains public for health checks.
- Local Govard dev uses `.dev.vars` with `ENVIRONMENT=development` and `DEV_USER_EMAIL`, which overrides production vars from `wrangler.toml`.

**Network issues:**

- `http://ledgard.test/` redirects to HTTPS. If terminal DNS lookup for `.test` is slow due to IPv6/AAAA resolution, use IPv4:

```bash
curl -4 -k https://ledgard.test/api/health
```

## Recurring Transactions

Cron is configured in [wrangler.toml](wrangler.toml):

```toml
[triggers]
crons = ["0 0 * * *"]
```

The scheduled Worker scans active scheduled transactions and inserts due ledger entries.

Miniflare local dev does not automatically trigger scheduled Workers. Test cron behavior through the service function or Wrangler scheduled testing mode when needed.

## Production Maintenance

### Gravatar Avatar Migration

After deploying code updates that include Gravatar support, existing members need their avatars migrated. The migration endpoint is admin-only and protected by Cloudflare Access.

**To run the migration:**

1. Open your production app in a browser (e.g., `https://ledger.example.com`)
2. Log in through Cloudflare Access
3. Open Developer Tools (F12) → Console tab
4. Run this code:

```javascript
fetch('/api/members/migrate-avatars', {
  method: 'POST',
  headers: { 'Accept': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('Migration result:', data))
.catch(err => console.error('Error:', err))
```

Expected response:

```json
{"data":{"updated":2}}
```

This will generate Gravatar URLs for all members based on their email addresses. New members automatically get Gravatar URLs when created.

## Scripts

Development (via Govard):

```bash
govard up                                        # Start web and worker services
govard tool npm run typecheck                    # TypeScript check
govard tool npm run test                         # Vitest unit tests
govard tool npm run test:watch                   # Vitest in watch mode
govard tool npm run build                        # Typecheck and build frontend assets
govard env exec worker npm run db:migrate:local  # Apply D1 migrations locally
```

Production deployment:

```bash
npm run db:migrate:remote   # Apply D1 migrations remotely
npm run deploy              # Build and deploy Worker/Assets
```

## Verification

Run before committing or deploying:

```bash
govard tool npm run typecheck
govard tool npm run test
govard tool npm run build
```

Smoke checks:

```bash
curl -4 -k https://ledgard.test/api/health
govard ps
govard logs -f
```

## Notes

- All local development uses Govard for consistent environment setup
- `wrangler.toml` contains a placeholder D1 id until you create the real Cloudflare D1 database
- Seed data is for development and MVP smoke testing
- Production seed files such as `seeds/production_vi.sql` are local/private bootstrap files and should not be pushed to git
- Currency switching changes the app/base display setting. It does not perform historical FX conversion
- The MVP debt/loan model uses ledger transaction types only; it does not yet have separate counterparty or obligation tables
