import { test, expect } from '@playwright/test';

async function instrument(page, fail = false) {
  await page.addInitScript(fail => {
    window.backgroundDraws = [];
    window.backgroundFrames = [];
    window.backgroundDeletes = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, options) {
      if (kind === 'webgl' && fail) return null;
      const gl = getContext.call(this, kind, options);
      if (kind === 'webgl' && gl) {
        const locations = new Map();
        const getUniformLocation = gl.getUniformLocation.bind(gl);
        gl.getUniformLocation = (...args) => {
          const location = getUniformLocation(...args);
          locations.set(location, args[1]);
          return location;
        };
        const uniforms = {};
        const uniform1f = gl.uniform1f.bind(gl);
        gl.uniform1f = (location, value) => {
          uniforms[locations.get(location)] = value;
          return uniform1f(location, value);
        };
        const draw = gl.drawArrays.bind(gl);
        gl.drawArrays = (...args) => {
          window.backgroundDraws.push(performance.now());
          window.backgroundFrames.push({ time: uniforms.u_time, amount: uniforms.u_amount });
          return draw(...args);
        };
        const remove = gl.deleteTexture.bind(gl);
        gl.deleteTexture = (...args) => {
          window.backgroundDeletes++;
          return remove(...args);
        };
      }
      return gl;
    };
  }, fail);
}

test('background continues beyond five seconds without fading out or restarting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await instrument(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const scene = page.locator('.home-background-animation');
  await expect(scene).toBeVisible();
  await expect(scene).toHaveAttribute('aria-hidden', 'true');
  expect(await scene.evaluate(el => el.inert)).toBe(true);
  expect(await scene.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  expect(await scene.evaluate(el => getComputedStyle(el).zIndex)).toBe('-1');
  await expect.poll(() => page.evaluate(() => window.backgroundDraws.length)).toBeGreaterThan(5);
  await expect.poll(() => page.evaluate(() => window.backgroundFrames.at(-1)?.time), { timeout: 8000 }).toBeGreaterThan(5.2);
  await expect(scene).toBeVisible();
  const state = await page.evaluate(() => ({ draws: window.backgroundDraws, frames: window.backgroundFrames, deletes: window.backgroundDeletes }));
  expect(state.draws.length).toBeLessThanOrEqual(Math.ceil((state.draws.at(-1) - state.draws[0]) * 30 / 1000) + 2);
  expect(state.frames.filter(frame => frame.time >= 1.2).every(frame => frame.amount === 1)).toBe(true);
  expect(state.frames.every((frame, i) => i === 0 || frame.time >= state.frames[i - 1].time)).toBe(true);
  expect(state.deletes).toBe(0);
  await expect.poll(() => page.evaluate(() => window.backgroundDraws.length)).toBeGreaterThan(state.draws.length);
  expect(errors).toEqual([]);
});

test('reduced motion is static on load and stops immediately on a live change', async ({ page }) => {
  await instrument(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.home-background-animation')).toHaveCount(0);
  expect(await page.evaluate(() => window.backgroundDraws.length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.home-background-animation')).toHaveCount(0);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.backgroundDraws.length)).toBeGreaterThan(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.home-background-animation')).toHaveCount(0);
  expect(await page.evaluate(() => window.backgroundDeletes)).toBe(1);
});

test('GPU failure leaves the original CSS image and foreground usable', async ({ page }) => {
  await instrument(page, true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.home-background-animation')).toHaveCount(0);
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('tcl-homepage-background.webp');
  await page.getByRole('link', { name: 'Browse articles', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/$/);
});

test('drawing and the scene clock suspend offscreen and in hidden documents, then resume smoothly', async ({ page }) => {
  await instrument(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.backgroundDraws.length)).toBeGreaterThan(3);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.locator('.home-background-animation').evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThan(0);
  await page.waitForTimeout(100);
  const offscreen = await page.evaluate(() => window.backgroundDraws.length);
  const pausedTime = await page.evaluate(() => window.backgroundFrames.at(-1).time);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.backgroundDraws.length)).toBe(offscreen);
  expect(await page.evaluate(() => window.backgroundFrames.at(-1).time)).toBe(pausedTime);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.backgroundDraws.length)).toBe(offscreen);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.backgroundDraws.length)).toBeGreaterThan(offscreen);
  const resumedTime = await page.evaluate(index => window.backgroundFrames[index].time, offscreen);
  expect(resumedTime - pausedTime).toBeLessThan(0.08);
});

for (const event of ['webglcontextlost', 'pagehide']) {
  test(`${event} restores the static background and releases resources`, async ({ page }) => {
    await instrument(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => window.backgroundDraws.length)).toBeGreaterThan(2);
    await page.evaluate(event => {
      const target = event === 'pagehide' ? window : document.querySelector('.home-background-animation canvas');
      target.dispatchEvent(new Event(event));
    }, event);
    await expect(page.locator('.home-background-animation')).toHaveCount(0);
    expect(await page.evaluate(() => window.backgroundDeletes)).toBe(1);
  });
}
