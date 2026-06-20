import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:5173/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('console', (m) => console.log('PAGE:', m.text()));
page.on('pageerror', (e) => console.log('ERROR:', e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
const touchInfo = await page.evaluate(() => ({
  maxTouchPoints: navigator.maxTouchPoints,
  coarse: window.matchMedia('(pointer: coarse)').matches,
  ontouchstart: 'ontouchstart' in window,
  bodyTouch: document.body.classList.contains('touch'),
}));
console.log('TOUCH:', JSON.stringify(touchInfo));

await page.click('#btn-start');
await page.waitForTimeout(300);

// expose player position via the debug hook
const pos = () => page.evaluate(() => {
  const p = window.__game?.player;
  return p ? { x: +p.position.x.toFixed(2), y: +p.position.y.toFixed(2), z: +p.position.z.toFixed(2), grounded: p.grounded, hearts: p.hearts } : null;
});

console.log('spawn:', JSON.stringify(await pos()));
// run forward 0.5s, jump, keep running, double jump — should cross gap 1
await page.keyboard.down('KeyW');
await page.waitForTimeout(500);
console.log('t=0.5 run:', JSON.stringify(await pos()));
await page.keyboard.press('Space');
await page.waitForTimeout(350);
console.log('t=0.85 jump:', JSON.stringify(await pos()));
await page.keyboard.press('Space');
await page.waitForTimeout(600);
console.log('t=1.45 djump:', JSON.stringify(await pos()));
await page.waitForTimeout(600);
console.log('t=2.05:', JSON.stringify(await pos()));
await page.keyboard.up('KeyW');
await page.waitForTimeout(800);
console.log('t=2.85 stop:', JSON.stringify(await pos()));
const hud = await page.evaluate(() => document.getElementById('crystals').textContent);
console.log('HUD crystals:', hud);
await page.screenshot({ path: 'test/shots/diag-final.png' });

await browser.close();
