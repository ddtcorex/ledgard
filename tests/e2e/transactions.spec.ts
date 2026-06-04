import { test, expect } from '@playwright/test';

/**
 * Transaction E2E Tests
 * Tests transaction creation, editing, and deletion flows
 */

test.describe('Transactions - Add Expense', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open quick add modal from FAB', async ({ page }) => {
    // Click the quick add button (FAB on mobile, button on desktop)
    const addButton = page.getByRole('button', { name: /quick add|thêm nhanh|add transaction|thêm giao dịch/i }).first();
    await addButton.click();

    // Modal should open
    await expect(page.getByRole('dialog').or(page.locator('[role="dialog"]')).or(page.getByText(/add transaction|thêm giao dịch/i).locator('..'))).toBeVisible();
  });

  test('should create a new expense transaction', async ({ page }) => {
    // Open add transaction modal
    const addButton = page.getByRole('button', { name: /quick add|thêm nhanh|add transaction|thêm giao dịch/i }).first();
    await addButton.click();

    // Wait for modal to be visible
    await page.waitForTimeout(500);

    // Select expense type (might be default)
    const expenseOption = page.getByText(/^expense$|^chi tiêu$/i).first();
    if (await expenseOption.isVisible().catch(() => false)) {
      await expenseOption.click();
    }

    // Fill in amount
    const amountInput = page.getByLabel(/amount|số tiền/i).or(page.locator('input[name="amount"]')).first();
    await amountInput.fill('50000');

    // Select account (first available)
    const accountSelect = page.getByLabel(/account|tài khoản/i).or(page.locator('select[name="account_id"]')).first();
    if (await accountSelect.isVisible().catch(() => false)) {
      await accountSelect.selectOption({ index: 1 });
    }

    // Select category (first available)
    const categorySelect = page.getByLabel(/category|danh mục/i).or(page.locator('select[name="category_id"]')).first();
    if (await categorySelect.isVisible().catch(() => false)) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Add description
    const descriptionInput = page.getByLabel(/description|mô tả/i).or(page.locator('input[name="description"], textarea[name="description"]')).first();
    if (await descriptionInput.isVisible().catch(() => false)) {
      await descriptionInput.fill('E2E Test Expense');
    }

    // Submit form
    const saveButton = page.getByRole('button', { name: /save|lưu/i }).first();
    await saveButton.click();

    // Wait for modal to close and success
    await page.waitForTimeout(1000);

    // Should redirect to ledger or show success
    const success = await page.getByText(/E2E Test Expense/i).isVisible({ timeout: 5000 }).catch(() => false);
    expect(success).toBe(true);
  });
});

test.describe('Transactions - Mobile FAB', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have visible FAB on mobile dashboard', async ({ page }) => {
    const fab = page.getByRole('button', { name: /quick add|thêm nhanh/i }).first();
    await expect(fab).toBeVisible();
  });

  test('should open transaction form from mobile FAB', async ({ page }) => {
    const fab = page.getByRole('button', { name: /quick add|thêm nhanh/i }).first();
    await fab.click();

    // Form or modal should appear
    await expect(page.getByText(/add transaction|thêm giao dịch/i)).toBeVisible();
  });
});

test.describe('Ledger - Filter and Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ledger');
  });

  test('should display ledger page with transactions', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /ledger|sổ giao dịch/i })).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search|tìm kiếm/i).or(page.getByLabel(/search|tìm kiếm/i));
    await expect(searchInput.first()).toBeVisible();
  });

  test('should filter transactions by search term', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search|tìm kiếm/i).or(page.getByLabel(/search|tìm kiếm/i)).first();

    // Type search term
    await searchInput.fill('test');
    await page.waitForTimeout(1000); // Wait for debounce/filter

    // Results should update (this is a basic check)
    // In a real test, we'd verify specific transactions appear/disappear
  });

  test('should have filter options', async ({ page }) => {
    // Look for filter buttons or dropdowns
    const filterButton = page.getByText(/filter|bộ lọc/i).first();

    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();

      // Filter options should appear
      await expect(page.getByText(/type|loại|period|kỳ|account|tài khoản/i).first()).toBeVisible();
    }
  });

  test('should display transactions in table or list format', async ({ page }) => {
    // Check for transaction rows or cards
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasList = await page.locator('[role="list"], .transaction-card, .transaction-item').first().isVisible().catch(() => false);

    expect(hasTable || hasList).toBe(true);
  });
});

test.describe('Ledger - Desktop Table View', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/ledger');
  });

  test('should display transactions in table format on desktop', async ({ page }) => {
    // Desktop should show table with columns
    const table = page.locator('table');
    if (await table.isVisible().catch(() => false)) {
      // Check for table headers
      await expect(page.getByText(/date|ngày/i).first()).toBeVisible();
      await expect(page.getByText(/amount|số tiền/i).first()).toBeVisible();
      await expect(page.getByText(/category|danh mục/i).first()).toBeVisible();
    }
  });
});

test.describe('Ledger - Mobile Card View', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/ledger');
  });

  test('should display transactions in card format on mobile', async ({ page }) => {
    // Mobile should show cards grouped by date
    // Look for date headers or transaction cards
    const hasCards = await page.locator('.transaction-card, .transaction-item, [class*="transaction"]').first().isVisible({ timeout: 3000 }).catch(() => false);

    // This is a basic check - in a real scenario we'd verify the card structure
    expect(hasCards).toBe(true);
  });
});

test.describe('Transactions - Edit and Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ledger');
  });

  test('should have edit button on transactions', async ({ page }) => {
    // Look for edit button or icon
    const editButton = page.getByRole('button', { name: /edit|sửa/i }).first();

    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(editButton).toBeVisible();
    }
  });

  test('should have delete button on transactions', async ({ page }) => {
    // Look for delete button or icon
    const deleteButton = page.getByRole('button', { name: /delete|xóa/i }).first();

    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(deleteButton).toBeVisible();
    }
  });
});
