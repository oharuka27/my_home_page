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

test('skills table becomes readable stacked cards', async ({ page }, testInfo) => {
  await page.goto('/#skills');

  const layout = await page.evaluate(() => {
    const wrap = document.querySelector('.skill-table-wrap');
    const table = document.querySelector('.skill-table');
    const head = table.querySelector('thead');
    const body = table.querySelector('tbody');
    const firstRow = body.querySelector('tr');
    return {
      fitsWithoutHorizontalScroll: wrap.scrollWidth <= wrap.clientWidth,
      tableMinWidth: getComputedStyle(table).minWidth,
      headDisplay: getComputedStyle(head).display,
      bodyDisplay: getComputedStyle(body).display,
      rowDisplay: getComputedStyle(firstRow).display,
    };
  });

  expect(layout.fitsWithoutHorizontalScroll).toBe(true);
  expect(layout.tableMinWidth).toBe('0px');
  expect(layout.headDisplay).toBe('none');
  expect(layout.bodyDisplay).toBe('grid');
  expect(layout.rowDisplay).toBe('block');

  const engine = testInfo.project.name.includes('WebKit') ? 'webkit' : 'chromium';
  await page.locator('#skills').screenshot({ path: `test-results/iphone-15-${engine}-skills.png` });
});

test('cat zone captures dragging while the lower hero keeps scrolling', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Raw touch injection is only available through Chromium CDP.');
  await page.goto('/');

  const zone = page.locator('.cat-drag-zone');
  await expect(zone).toBeVisible();
  await expect(zone).toHaveCSS('touch-action', 'none');
  const box = await zone.boundingBox();

  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 60, y }],
  });

  await expect(zone).toHaveClass(/is-dragging/);
  expect(await page.evaluate(() => scrollY)).toBe(0);

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(zone).not.toHaveClass(/is-dragging/);
});

test('mobile menu releases its highlight and hides the text arrow', async ({ page }) => {
  await page.goto('/');
  const menuItem = page.locator('.hero-nav a').first();

  await menuItem.tap();

  await expect.poll(() => menuItem.evaluate(element => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    transform: getComputedStyle(element).transform,
    arrowDisplay: getComputedStyle(element, '::before').display,
  }))).toEqual({
    backgroundColor: 'rgba(233, 228, 218, 0.72)',
    transform: 'none',
    arrowDisplay: 'none',
  });
});
