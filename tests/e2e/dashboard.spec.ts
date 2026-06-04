import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * Tests the main dashboard page rendering and KPI display
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render dashboard with main KPIs', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.locator('h1, h2').filter({ hasText: /overview|tổng quan/i })).toBeVisible();

    // Check for Available Cash KPI
    await expect(page.getByText(/available cash|tiền khả dụng/i)).toBeVisible();

    // Check for Net Worth KPI
    await expect(page.getByText(/net worth|tài sản ròng/i)).toBeVisible();
  });

  test('should display recent transactions section', async ({ page }) => {
    await expect(page.getByText(/recent transactions|giao dịch gần đây/i)).toBeVisible();
  });

  test('should display category distribution chart', async ({ page }) => {
    await expect(page.getByText(/category distribution|phân bổ danh mục/i)).toBeVisible();
  });

  test('should display member contribution chart', async ({ page }) => {
    await expect(page.getByText(/member contribution|chi tiêu theo thành viên/i)).toBeVisible();
  });

  test('should display cashflow chart', async ({ page }) => {
    await expect(page.getByText(/cashflow|dòng tiền/i)).toBeVisible();
  });

  test('should have working navigation to ledger', async ({ page }) => {
    await page.getByRole('link', { name: /ledger|sổ giao dịch/i }).click();
    await expect(page).toHaveURL(/\/ledger/);
  });

  test('should have working navigation to budgets', async ({ page }) => {
    await page.getByRole('link', { name: /budgets|ngân sách/i }).click();
    await expect(page).toHaveURL(/\/budgets/);
  });

  test('should have working navigation to settings', async ({ page }) => {
    await page.getByRole('link', { name: /settings|cài đặt/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('Dashboard - Time Range Selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have time range selector', async ({ page }) => {
    // Look for time range buttons or selector
    const timeRangeOptions = [
      /today|hôm nay/i,
      /this week|tuần này/i,
      /this month|tháng này/i,
      /this year|năm nay/i
    ];

    let found = false;
    for (const pattern of timeRangeOptions) {
      const element = page.getByText(pattern).first();
      if (await element.isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }

    expect(found).toBe(true);
  });
});

test.describe('Dashboard - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display mobile bottom navigation', async ({ page }) => {
    // Check for mobile navigation bar at bottom
    const nav = page.locator('nav').last();
    await expect(nav).toBeVisible();
  });

  test('should have quick add FAB button', async ({ page }) => {
    // Look for floating action button (FAB) for quick add
    const fab = page.getByRole('button', { name: /quick add|thêm nhanh|add transaction|thêm giao dịch/i }).first();
    await expect(fab).toBeVisible();
  });
});

test.describe('Dashboard - Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display desktop sidebar navigation', async ({ page }) => {
    // Check for sidebar (should be visible on desktop)
    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('should display all charts in grid layout', async ({ page }) => {
    // On desktop, charts should be visible without scrolling much
    await expect(page.getByText(/category distribution|phân bổ danh mục/i)).toBeVisible();
    await expect(page.getByText(/member contribution|chi tiêu theo thành viên/i)).toBeVisible();
  });
});
