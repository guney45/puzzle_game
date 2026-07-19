import { expect, test } from '@playwright/test';

test('boot scene loads and canvas exists', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible();
});
