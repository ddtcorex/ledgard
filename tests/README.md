# Testing Guide

This document describes the test suite for Ledgard and how to run the tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests (Vitest)
│   ├── finance.test.ts      # Financial calculations (6 tests)
│   ├── validation.test.ts   # Zod schema validation (58 tests)
│   └── i18n.test.ts         # Internationalization (35 tests)
├── integration/             # Integration tests (Vitest)
│   └── api.test.ts          # API integration test templates (16 skipped)
└── e2e/                     # End-to-end tests (Playwright)
    ├── dashboard.spec.ts    # Dashboard rendering and navigation
    ├── transactions.spec.ts # Transaction CRUD and ledger
    ├── budgets.spec.ts      # Budget management
    ├── admin.spec.ts        # Admin features and period lock
    └── locale.spec.ts       # Locale switching and i18n
```

## Test Coverage

### Unit Tests (99 tests passing)

**Finance Tests** (`tests/unit/finance.test.ts`)
- Liquidity calculation (cash + bank + savings)
- Net worth calculation (including credit card liabilities)
- Balance effects for all transaction types
- Money conversion (major/minor units)
- Month range calculations

**Validation Tests** (`tests/unit/validation.test.ts`)
- All Zod schemas (currency, locale, account types, etc.)
- Transaction input validation (amount > 0, date format, etc.)
- Budget validation (month/year ranges, positive amounts)
- Member and account validation
- Scheduled transaction validation

**i18n Tests** (`tests/unit/i18n.test.ts`)
- Vietnamese diacritic removal
- Vietnamese character variations for search
- Translation lookup and fallback (vi → en → key)
- Display text formatting
- Bilingual search matching
- Parameter interpolation

### E2E Tests (Playwright)

**Dashboard Tests** (`tests/e2e/dashboard.spec.ts`)
- KPI display (Available Cash, Net Worth)
- Chart rendering (category distribution, member contribution, cashflow)
- Recent transactions
- Time range selector
- Navigation between pages
- Mobile FAB button
- Desktop sidebar
- Responsive layouts

**Transaction Tests** (`tests/e2e/transactions.spec.ts`)
- Quick add modal from FAB
- Create expense transaction
- Ledger page rendering
- Search and filter functionality
- Desktop table view
- Mobile card view
- Edit and delete buttons

**Budget Tests** (`tests/e2e/budgets.spec.ts`)
- Budget page navigation
- Create shared budget
- Budget progress display
- Shared vs individual budget tabs
- Category structure
- Month/year selector

**Admin Tests** (`tests/e2e/admin.spec.ts`)
- Settings page sections
- Period lock display and configuration
- Period lock enforcement (blocks editing locked transactions)
- Account management
- Member management
- Recurring transactions
- App configuration (language, currency)

**Locale Tests** (`tests/e2e/locale.spec.ts`)
- Language selector
- Switch between English and Vietnamese
- Locale persistence after reload
- Dashboard translation
- Navigation translation
- Form translation
- Transaction type translation
- Fallback behavior for missing translations

### Integration Tests (Templates)

Integration test templates are provided in `tests/integration/api.test.ts` with TODO comments for:
- Transaction CRUD and balance updates
- Period lock enforcement at database level
- Budget calculation (shared vs individual)
- Scheduled transaction cron execution
- D1 migrations and constraints
- Authentication middleware

These tests are currently skipped and serve as documentation for future implementation.

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- tests/unit/finance.test.ts
```

### E2E Tests

**Prerequisites:**
1. Start Govard services: `govard up`
2. Ensure app is running at `https://ledgard.test/`

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Run only mobile tests
npm run test:e2e:mobile

# Run only desktop tests
npm run test:e2e:desktop

# View test report
npm run test:e2e:report
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Test Configuration

### Vitest Configuration

`vitest.config.ts` configures unit and integration tests:
- Environment: jsdom (for React component testing)
- Excludes: node_modules, dist, .wrangler, tests/e2e
- Globals: enabled for describe/it/expect

### Playwright Configuration

`playwright.config.ts` configures E2E tests:
- Base URL: `https://ledgard.test` (configurable via `PLAYWRIGHT_BASE_URL`)
- Projects: mobile (390x844), tablet (768x1024), desktop (1440x900)
- Retries: 2 in CI, 0 locally
- Screenshots: on failure
- Trace: on first retry
- HTTPS errors: ignored (for local dev with self-signed certs)

## Test Viewports

E2E tests run on three viewport sizes matching the implementation plan:
- **Mobile**: 390x844 (iPhone 13)
- **Tablet**: 768x1024
- **Desktop**: 1440x900

## Writing New Tests

### Unit Tests

Use Vitest with the standard describe/it/expect API:

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expectedValue);
  });
});
```

### E2E Tests

Use Playwright with page object patterns:

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-page');
  });

  test('should do something', async ({ page }) => {
    await page.getByRole('button', { name: /click me/i }).click();
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

## CI/CD Integration

Tests are ready for CI/CD integration:
- Unit tests run fast (~600ms) and require no external dependencies
- E2E tests require a running Govard environment
- Playwright retries failing tests 2x in CI mode
- Test reports are generated in HTML format

## Test Maintenance

### When to Update Tests

- **Unit tests**: Update when changing business logic, validation rules, or calculations
- **E2E tests**: Update when changing UI structure, navigation, or user flows
- **Integration tests**: Implement when adding new API endpoints or database operations

### Test Data

- Unit tests use inline test data
- E2E tests use the seeded data from `migrations/0003_seed_defaults.sql`
- Integration tests should use isolated test data (to be implemented)

## Known Limitations

1. **Integration tests**: Currently templates only, need implementation with test database setup
2. **Visual regression**: No automated screenshot comparison yet
3. **Accessibility**: No automated a11y testing yet (manual testing performed)
4. **Performance**: No load testing or performance benchmarks

## Future Improvements

1. Implement integration tests with test D1 database
2. Add visual regression testing with Playwright screenshots
3. Add accessibility testing with axe-core
4. Add performance testing with Lighthouse CI
5. Add test coverage reporting
6. Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
