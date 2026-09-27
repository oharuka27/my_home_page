const { test, expect } = require('@playwright/test');

test('cat race button is disabled while the fish column is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 850, height: 900 });
  await page.goto('/#profile');
  const catButton = page.locator('.cat-button');
  const caption = page.locator('.profile-art figcaption');

  await expect(catButton).toBeDisabled();
  await expect(catButton).toHaveAttribute('aria-label', 'ぐるぐる回る3匹の猫');

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(catButton).toBeEnabled();
  await expect(catButton).toHaveAttribute('aria-label', /魚を捕りに走ります/);

  await catButton.click();
  await expect(caption).toHaveText('GO!');

  // Narrowing mid-race calls the cats back instead of leaving them stranded.
  await page.setViewportSize({ width: 850, height: 900 });
  await expect(caption).toHaveText('3 RESCUED CATS');
  await expect(catButton).toBeDisabled();
  await expect(page.locator('.race-layer')).toHaveCount(0, { timeout: 2000 });
});

test('keyboard users continue tabbing from the section a hero link jumps to', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  await page.locator('.hero-nav a').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#portfolio$/);
  // WebKit only moves focus to links with Alt+Tab unless full keyboard access is enabled.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.locator('.work-card').first()).toBeFocused();
});
