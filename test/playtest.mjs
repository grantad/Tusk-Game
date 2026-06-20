// Headless smoke test: load game, start, run forward, jump, screenshot.
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:5173/';
const browser = await chromium.launch();
const errors = [];

async function run(name, { width, height, mobile }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: mobile,
    isMobile: mobile,
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
      : undefined,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `test/shots/${name}-1-title.png` });

  if (mobile) await page.tap('#btn-start');
  else await page.click('#btn-start');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test/shots/${name}-2-spawn.png` });

  if (!mobile) {
    // run forward and jump a couple of times
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(900);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(900);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: `test/shots/${name}-3-moved.png` });
    // horn charge
    await page.keyboard.press('ShiftLeft');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test/shots/${name}-4-charge.png` });
  } else {
    // tap jump button
    await page.tap('#btn-jump');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test/shots/${name}-3-jump.png` });
  }
  await ctx.close();
}

await run('desktop', { width: 1280, height: 800, mobile: false });
await run('mobile', { width: 390, height: 844, mobile: true });

await browser.close();
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — no console/page errors');
