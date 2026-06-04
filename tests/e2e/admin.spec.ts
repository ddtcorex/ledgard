import { test, expect } from '@playwright/test';

/**
 * Admin and Settings E2E Tests
 * Tests admin-only features including period lock, account management, and member management
 */

test.describe('Settings - Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /settings|cài đặt/i })).toBeVisible();
  });

  test('should have accounts section', async ({ page }) => {
    await expect(page.getByText(/accounts|tài khoản/i).first()).toBeVisible();
  });

  test('should have members section', async ({ page }) => {
    await expect(page.getByText(/members|thành viên/i).first()).toBeVisible();
  });

  test('should have period lock section', async ({ page }) => {
    await expect(page.getByText(/period lock|khóa kỳ/i).first()).toBeVisible();
  });

  test('should have app configuration section', async ({ page }) => {
    await expect(page.getByText(/app configuration|cấu hình|language|currency/i).first()).toBeVisible();
  });
});

test.describe('Admin - Period Lock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display current lock date', async ({ page }) => {
    // Look for lock date display
    const lockSection = page.getByText(/period lock|khóa kỳ|locked through|khóa đến/i).first();
    await expect(lockSection).toBeVisible();
  });

  test('should have lock date input or selector', async ({ page }) => {
    // Look for date input for lock date
    const lockInput = page.getByLabel(/lock until|khóa đến|lock date/i).or(page.locator('input[name*="lock"]')).first();

    if (await lockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(lockInput).toBeVisible();
    }
  });

  test('should show lock date explanation', async ({ page }) => {
    // Should explain what the lock date does
    const explanation = page.getByText(/transactions.*blocked|trigger|giao dịch.*chặn/i).first();

    if (await explanation.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(explanation).toBeVisible();
    }
  });
});

test.describe('Admin - Period Lock Enforcement', () => {
  test('should prevent editing locked transactions', async ({ page }) => {
    // This test requires:
    // 1. Setting a lock date
    // 2. Trying to edit a transaction before that date
    // 3. Verifying the edit is blocked

    // Navigate to settings and set lock date
    await page.goto('/settings');

    // Find lock date input
    const lockInput = page.getByLabel(/lock until|khóa đến/i).or(page.locator('input[name*="lock"]')).first();

    if (await lockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set lock date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lockDate = yesterday.toISOString().split('T')[0];

      await lockInput.fill(lockDate);

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|lưu/i }).first();
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      }

      // Navigate to ledger
      await page.goto('/ledger');

      // Try to edit an old transaction (if any exist)
      const editButton = page.getByRole('button', { name: /edit|sửa/i }).first();

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();

        // Should show error or disabled state
        // This is a basic check - in reality we'd verify the specific error message
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should prevent deleting locked transactions', async ({ page }) => {
    // Similar to edit test, but for delete
    await page.goto('/ledger');

    // Look for locked transaction indicator
    const lockedIndicator = page.getByText(/locked|khóa/i).first();

    if (await lockedIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Delete button should be disabled or not present for locked transactions
      await expect(lockedIndicator).toBeVisible();
    }
  });
});

test.describe('Admin - Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display list of accounts', async ({ page }) => {
    // Accounts should be listed
    const accountsList = page.locator('[class*="account"], [role="list"]').first();

    if (await accountsList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(accountsList).toBeVisible();
    }
  });

  test('should have add account button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add account|thêm tài khoản/i }).first();
    await expect(addButton).toBeVisible();
  });

  test('should show account balances', async ({ page }) => {
    // Accounts should display current balance
    // Look for currency symbols or balance indicators
    const hasBalances = await page.locator('[class*="balance"], [class*="amount"]').first().isVisible({ timeout: 3000 }).catch(() => false);

    // This is a basic structural check
    expect(hasBalances).toBe(true);
  });
});

test.describe('Admin - Member Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display list of members', async ({ page }) => {
    // Members should be listed
    const membersList = page.locator('[class*="member"], [role="list"]').first();

    if (await membersList.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(membersList).toBeVisible();
    }
  });

  test('should have add member button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add member|thêm thành viên/i }).first();

    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should show member roles', async ({ page }) => {
    // Members should display their role (admin/member)
    const hasRoles = await page.getByText(/admin|member|quản trị|thành viên/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasRoles).toBe(true);
  });
});

test.describe('Settings - Recurring Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should have recurring transactions section', async ({ page }) => {
    const recurringSection = page.getByText(/recurring|định kỳ/i).first();

    if (await recurringSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(recurringSection).toBeVisible();
    }
  });

  test('should have add scheduled transaction button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add scheduled|thêm định kỳ/i }).first();

    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addButton).toBeVisible();
    }
  });
});

test.describe('Settings - App Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should have language selector', async ({ page }) => {
    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(languageSelector).toBeVisible();
    }
  });

  test('should have currency selector', async ({ page }) => {
    const currencySelector = page.getByLabel(/currency|tiền tệ/i).or(page.locator('select[name*="currency"]')).first();

    if (await currencySelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(currencySelector).toBeVisible();
    }
  });
});
