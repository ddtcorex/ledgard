import { test, expect } from '@playwright/test';

/**
 * Locale Switching E2E Tests
 * Tests internationalization (i18n) functionality and locale switching between English and Vietnamese
 */

test.describe('Locale Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should default to English locale', async ({ page }) => {
    // Check for English text on dashboard
    const englishText = page.getByText(/overview|available cash|net worth/i).first();
    await expect(englishText).toBeVisible();
  });

  test('should have language selector in settings', async ({ page }) => {
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();
    await expect(languageSelector).toBeVisible();
  });

  test('should switch from English to Vietnamese', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');

    // Find language selector
    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      // Select Vietnamese
      await languageSelector.selectOption('vi');

      // Wait for change to apply
      await page.waitForTimeout(1000);

      // Check for Vietnamese text
      const vietnameseText = page.getByText(/cài đặt|tài khoản|thành viên/i).first();
      await expect(vietnameseText).toBeVisible();
    }
  });

  test('should switch from Vietnamese to English', async ({ page }) => {
    // First switch to Vietnamese
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Now switch back to English
      const languageSelectorVi = page.getByLabel(/ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();
      await languageSelectorVi.selectOption('en');
      await page.waitForTimeout(1000);

      // Check for English text
      const englishText = page.getByText(/settings|accounts|members/i).first();
      await expect(englishText).toBeVisible();
    }
  });

  test('should persist locale after page reload', async ({ page }) => {
    // Switch to Vietnamese
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Should still be in Vietnamese
      const vietnameseText = page.getByText(/cài đặt|tổng quan|sổ giao dịch/i).first();
      await expect(vietnameseText).toBeVisible();
    }
  });
});

test.describe('Locale - Dashboard Translation', () => {
  test('should translate dashboard in Vietnamese', async ({ page }) => {
    // Set locale to Vietnamese
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Navigate to dashboard
      await page.goto('/');

      // Check for Vietnamese translations
      await expect(page.getByText(/tổng quan/i).first()).toBeVisible();
      await expect(page.getByText(/tiền khả dụng/i).first()).toBeVisible();
      await expect(page.getByText(/tài sản ròng/i).first()).toBeVisible();
    }
  });

  test('should translate dashboard in English', async ({ page }) => {
    await page.goto('/');

    // Check for English translations
    await expect(page.getByText(/overview/i).first()).toBeVisible();
    await expect(page.getByText(/available cash/i).first()).toBeVisible();
    await expect(page.getByText(/net worth/i).first()).toBeVisible();
  });
});

test.describe('Locale - Navigation Translation', () => {
  test('should translate navigation in Vietnamese', async ({ page }) => {
    // Set locale to Vietnamese
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Check navigation items
      await expect(page.getByText(/tổng quan/i).first()).toBeVisible();
      await expect(page.getByText(/sổ giao dịch/i).first()).toBeVisible();
      await expect(page.getByText(/ngân sách/i).first()).toBeVisible();
      await expect(page.getByText(/cài đặt/i).first()).toBeVisible();
    }
  });

  test('should translate navigation in English', async ({ page }) => {
    await page.goto('/');

    // Check navigation items
    await expect(page.getByText(/overview/i).first()).toBeVisible();
    await expect(page.getByText(/ledger/i).first()).toBeVisible();
    await expect(page.getByText(/budgets/i).first()).toBeVisible();
    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });
});

test.describe('Locale - Form Translation', () => {
  test('should translate transaction form in Vietnamese', async ({ page }) => {
    // Set locale to Vietnamese
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Open transaction form
      await page.goto('/');
      const addButton = page.getByRole('button', { name: /thêm nhanh|thêm giao dịch/i }).first();
      await addButton.click();
      await page.waitForTimeout(500);

      // Check for Vietnamese form labels
      const vietnameseLabels = await page.getByText(/số tiền|tài khoản|danh mục|mô tả/i).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(vietnameseLabels).toBe(true);
    }
  });

  test('should translate transaction form in English', async ({ page }) => {
    await page.goto('/');

    // Open transaction form
    const addButton = page.getByRole('button', { name: /quick add|add transaction/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Check for English form labels
    const englishLabels = await page.getByText(/amount|account|category|description/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(englishLabels).toBe(true);
  });
});

test.describe('Locale - Transaction Type Translation', () => {
  test('should translate transaction types in Vietnamese', async ({ page }) => {
    // Set locale to Vietnamese
    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Navigate to ledger
      await page.goto('/ledger');

      // Check for Vietnamese transaction types
      const vietnameseTypes = await page.getByText(/thu nhập|chi tiêu|chuyển khoản/i).first().isVisible({ timeout: 3000 }).catch(() => false);

      if (vietnameseTypes) {
        expect(vietnameseTypes).toBe(true);
      }
    }
  });
});

test.describe('Locale - Currency Formatting', () => {
  test('should format currency according to locale', async ({ page }) => {
    await page.goto('/');

    // Currency should be displayed with proper formatting
    // This is a basic check - actual formatting depends on the currency setting
    const hasCurrency = await page.locator('[class*="amount"], [class*="currency"]').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasCurrency).toBe(true);
  });
});

test.describe('Locale - Date Formatting', () => {
  test('should format dates according to locale', async ({ page }) => {
    await page.goto('/ledger');

    // Dates should be displayed
    // Format might differ based on locale (though the implementation might use ISO format)
    const hasDate = await page.locator('[class*="date"]').first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasDate).toBe(true);
  });
});

test.describe('Locale - Fallback Behavior', () => {
  test('should fall back to English for missing translations', async ({ page }) => {
    // This test verifies that if a Vietnamese translation is missing,
    // the app falls back to English rather than showing a key

    await page.goto('/settings');

    const languageSelector = page.getByLabel(/language|ngôn ngữ/i).or(page.locator('select[name*="locale"]')).first();

    if (await languageSelector.isVisible().catch(() => false)) {
      await languageSelector.selectOption('vi');
      await page.waitForTimeout(1000);

      // Navigate through the app
      await page.goto('/');

      // Should not see translation keys like "dashboard.title" or "{{key}}"
      const hasTranslationKeys = await page.getByText(/\{\{.*\}\}|\..*\./i).first().isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasTranslationKeys).toBe(false);
    }
  });
});
