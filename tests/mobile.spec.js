const { test, expect } = require('@playwright/test');

test('iPhone viewport fits and canvas permits vertical scrolling', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    canvasTouchAction: getComputedStyle(document.querySelector('#orb')).touchAction,
  }));

  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.canvasTouchAction).toBe('pan-y');

  const titleBox = await page.locator('h1').boundingBox();
  const dragHintBox = await page.locator('.interaction-hint').boundingBox();
  const navBox = await page.locator('.hero-nav').boundingBox();
  const scrollCueBox = await page.locator('.scroll-cue').boundingBox();
  const viewport = page.viewportSize();
  expect(titleBox.x).toBeGreaterThanOrEqual(16);
  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(viewport.width - 16);
  expect(titleBox.y).toBeGreaterThanOrEqual(viewport.height * 0.4);
  expect(dragHintBox.y + dragHintBox.height).toBeLessThanOrEqual(titleBox.y - 12);
  expect(navBox.y + navBox.height).toBeLessThanOrEqual(scrollCueBox.y - 16);

  const engine = testInfo.project.name.includes('WebKit') ? 'webkit' : 'chromium';
  await page.screenshot({ path: `test-results/iphone-15-${engine}-hero.png` });
  await page.screenshot({ path: `test-results/iphone-15-${engine}-home.png`, fullPage: true });
});

test('full-screen canvas allows a native vertical touch gesture', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Raw touch injection is only available through Chromium CDP.');

  await page.goto('/');

  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 330, y: 760 }],
  });
  for (const y of [700, 620, 540, 460, 380, 300, 220]) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 330, y }],
    });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});
