# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ledgard is a single-ledger family finance PWA running on Cloudflare Workers with a React frontend and Hono API backend backed by Cloudflare D1 (SQLite).

**Key stacks:**
- Frontend: React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v7
- Backend: Hono on Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Auth: Cloudflare Access (production), DEV_USER_EMAIL fallback (local dev only)

## Common Commands

```bash
# Govard Setup
govard svc up               # Start shared Govard services
govard tool npm install     # Install dependencies
govard up                   # Start web and worker services
govard env exec worker npm run db:migrate:local  # Apply D1 migrations

# Development (runs automatically with govard up)
# - web service: Vite on port 80 (https://ledgard.test/)
# - worker service: Wrangler on port 8787

# Verification
govard tool npm run typecheck    # TypeScript check
govard tool npm run test         # Vitest unit tests
govard tool npm run test:watch   # Vitest in watch mode
govard tool npm run build        # Typecheck + Vite build to dist/client

# Govard Management
govard ps                   # Check service status
govard logs -f              # Follow logs
govard restart              # Restart services
govard down                 # Stop services
govard diag --fix           # Fix common issues

# Production Deployment
npm run db:migrate:remote   # Apply D1 migrations to production
npm run deploy              # Build and deploy to Cloudflare
```

## Architecture

```
src/
├── client/                 # React frontend
│   ├── app/                # App shell, routing, providers
│   ├── features/           # Page components (dashboard, ledger, budgets, settings)
│   └── shared/             # API client, components, i18n, utilities
├── worker/                 # Hono API backend
│   ├── services/           # Business logic (accounts, transactions, budgets, etc.)
│   ├── middleware/         # Auth, error handling
│   ├── validation/         # Zod schemas
│   └── db/                 # D1 helper
└── shared/                 # Shared between client/worker
    ├── types/domain.ts      # TypeScript interfaces
    ├── finance/            # Financial calculations
    └── constants/          # Currencies

migrations/                 # D1 schema files (0001-0003)
tests/unit/                 # Vitest tests
```

## Key Patterns

### Money Handling
- All monetary values stored as **integers in minor units** (cents, not decimals)
- Use `toMajorUnits(cents, currency)` / `fromMajorUnits(amount, currency)` from `src/shared/finance/money.ts`
- VND and JPY have 0 decimal places; USD, EUR, etc. have 2

### Financial Calculations
- `getBalanceEffects()` in `src/shared/finance/calculations.ts` determines how a transaction affects account balances
- `calculateAvailableCash()` sums liquid accounts (cash, bank, savings)
- `calculateNetWorth()` includes credit card liabilities and loan/debt positions

### Transaction Types
Seven types: `income`, `expense`, `transfer`, `loan`, `debt`, `debt_collection`, `repayment`

### Recurring Budgets
Ledgard supports recurring budgets that automatically create budgets on a schedule:
- **Monthly**: Creates budget every month
- **Quarterly**: Creates budget every 3 months (Jan, Apr, Jul, Oct)
- **Yearly**: Creates budget once per year

Recurring budgets are processed by the Worker cron handler (runs daily at midnight UTC). The system uses idempotency tracking via the `recurring_budget_runs` table to prevent duplicate budget creation.

**Database Tables:**
- `recurring_budgets` - Stores recurring budget rules
- `recurring_budget_runs` - Tracks which budgets have been created (prevents duplicates)
- `budgets.source` - Tracks how budget was created (`manual`, `recurring`, `template`)
- `budgets.recurring_budget_id` - Links budget to its recurring rule

**API Endpoints:**
- `GET /api/recurring-budgets` - List all recurring budgets
- `POST /api/recurring-budgets` - Create new recurring budget (admin only)
- `PATCH /api/recurring-budgets/:id` - Update recurring budget (admin only)
- `DELETE /api/recurring-budgets/:id` - Delete recurring budget (admin only)

### Budget Templates
Save current month's budgets as a template for reuse:
- **Personal templates** - Visible only to creator
- **Shared templates** - Visible to all members (admin only)
- Apply template to any future month
- Prevents duplicate budgets when applying template multiple times

**Database Tables:**
- `budget_templates` - Stores template metadata
- `budget_template_items` - Stores individual budget entries in template

**API Endpoints:**
- `GET /api/budget-templates` - List templates (user's + shared)
- `GET /api/budget-templates/:id/items` - Get template items
- `POST /api/budget-templates` - Create template (admin only)
- `PATCH /api/budget-templates/:id` - Update template (admin only)
- `DELETE /api/budget-templates/:id` - Delete template (admin only)
- `POST /api/budget-templates/:id/apply` - Apply template to target month (admin only)

### Period Locking
- `system_settings.global_lock_until_date` controls the locked period
- D1 triggers in `0002_triggers_indexes.sql` block INSERT/UPDATE/DELETE on transactions dated on or before the lock date

### Authentication
- Production: Cloudflare Access injects `CF-Access-Authenticated-User-Email` header
- Local dev: `DEV_USER_EMAIL` from `.dev.vars` is used (only when `ENVIRONMENT != production`)
- All authenticated requests resolve to a `Member` via `authenticate` middleware
- Admin-only routes use `requireAdmin` middleware

### API Design
- Hono router at `src/worker/app.ts`
- All responses wrapped as `{ data: T }` or `{ error: { code, message } }`
- Zod validation via `@hono/zod-validator` on all POST/PATCH endpoints
- Cursor-based pagination on `/transactions` endpoint

### Database Conventions
- IDs are string slugs (e.g., `cat-housing`, `acc-cash`)
- Timestamps stored as UTC TEXT (`datetime('now', 'utc')`)
- Foreign key constraints enabled via `PRAGMA foreign_keys = ON`

### Localization
- **IMPORTANT**: Always ensure localization support is maintained across all features
- Two supported locales: `en` (English) and `vi` (Vietnamese)
- User can switch language in Settings page
- Default locale set via `system_settings.default_locale` or `DEFAULT_LOCALE` env var
- All user-facing text must use `useI18n()` hook and `t()` function
- Translation keys defined in `src/client/shared/i18n/translations.ts`
- Use `displayText(value, locale)` for database-stored multilingual content
- Date formatting respects locale via `formatDate(date, locale)`
- Currency formatting respects locale via `<Money>` component
- **When adding new features**: Always add translation keys for both `en` and `vi`
- **When modifying UI**: Verify text uses `t()` instead of hardcoded strings

## Development Notes

- All local development uses Govard
- Govard runs two services: `web` (Vite port 80) and `worker` (Wrangler port 8787)
- Vite proxies `/api` to `http://worker:8787` via `LEDGARD_API_PROXY_TARGET`
- Access the app at `https://ledgard.test/`
- Health check at `https://ledgard.test/api/health`
- Cron trigger runs daily at midnight UTC (`wrangler.toml` config)
- Scheduled transactions are processed by the Worker cron handler