import { test, expect } from '@playwright/test';

test('workspace health check placeholder', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Graphology Platform/);
});
