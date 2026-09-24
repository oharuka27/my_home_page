const { test, expect } = require('@playwright/test');

test('cat animation keeps a bounded rendering workload on a Chromebook viewport', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    window.renderStats = { frames: 0, arcs: 0 };
    const originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      window.renderStats.frames++;
      return originalClearRect.apply(this, args);
    };
    const originalArc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      window.renderStats.arcs++;
      return originalArc.apply(this, args);
    };
  });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const start = { ...window.renderStats };
    await new Promise(resolve => setTimeout(resolve, 1000));
    const canvas = document.querySelector('#orb');
    return {
      frames: window.renderStats.frames - start.frames,
      arcsPerFrame: (window.renderStats.arcs - start.arcs) / (window.renderStats.frames - start.frames),
      pixels: canvas.width * canvas.height,
    };
  });
  expect(result.arcsPerFrame).toBeLessThan(500);
  expect(result.pixels).toBeLessThanOrEqual(1366 * 768 * 2.25);
  expect(result.frames).toBeLessThanOrEqual(35);
});
