import { test, expect } from '@playwright/test';

test('search 546 → click first ref → second card appears', async ({ page }) => {
  await page.goto('/');

  // Search for section 546 via the top-bar input.
  await page.getByPlaceholder(/Search by section/).fill('546');

  // The dropdown shows matches. Click the first § 546 result.
  await page.getByRole('listitem').filter({ hasText: /§\s*546/ }).first().click();

  // Section card header should show the heading.
  await expect(page.getByText('Limitations on avoiding powers')).toBeVisible();

  // There's exactly one card open right now — count the header "§" spans.
  const sectionHeaders = page.locator('.bg-slate-50', { hasText: /^§\s/ });
  await expect(sectionHeaders).toHaveCount(1);

  // Click the first clickable ref inside the body of the card.
  // Clickable refs have class text-refLink (per InlineMarkup).
  const firstRef = page.locator('.text-refLink').first();
  await firstRef.click();

  // After the click, we should have 2 section cards rendered.
  await expect(sectionHeaders).toHaveCount(2);
});

test('export session produces a JSON download', async ({ page }) => {
  await page.goto('/');

  // Seed a single card so the export has something to serialize.
  await page.getByPlaceholder(/Search by section/).fill('546');
  await page.getByRole('listitem').filter({ hasText: /§\s*546/ }).first().click();
  await expect(page.getByText('Limitations on avoiding powers')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^canvas-\d+\.json$/);
});
