// Logic checks: spikes hurt, stomping kills enemies, goal wins.
import { chromium } from 'playwright';

const URL = process.env.GAME_URL || 'http://localhost:5173/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const fails = [];
page.on('pageerror', (e) => fails.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.click('#btn-start');
await page.waitForTimeout(300);

const tp = (x, y, z) => page.evaluate(([x, y, z]) => {
  const p = window.__game.player;
  p.position.set(x, y, z);
  p.velocity.set(0, 0, 0);
  p.invuln = 0;
}, [x, y, z]);

// 1. spikes damage
await tp(-2.5, 4.5, -80);
await page.waitForTimeout(600);
let hearts = await page.evaluate(() => window.__game.player.hearts);
if (hearts >= 3) fails.push(`spikes did not damage (hearts=${hearts})`);
else console.log('spike damage OK, hearts =', hearts);

// 2. stomp kills enemy 1 (drop onto its patrol midpoint)
await page.evaluate(() => {
  const g = window.__game;
  const e = g.level.enemies[0];
  g.player.position.set(e.position.x, e.position.y + 2.2, e.position.z);
  g.player.velocity.set(0, -6, 0);
  g.player.invuln = 0;
  // freeze enemy under the player for a deterministic stomp
  e.a.copy(e.position);
  e.b.copy(e.position);
});
await page.waitForTimeout(700);
const enemyAlive = await page.evaluate(() => window.__game.level.enemies[0].alive);
if (enemyAlive) fails.push('stomp did not kill enemy');
else console.log('stomp kill OK');

// 3. checkpoint activates
await tp(0, 4.2, -70);
await page.waitForTimeout(400);
const cpActive = await page.evaluate(() => window.__game.level.checkpoints[1].activated);
if (!cpActive) fails.push('checkpoint 1 did not activate');
else console.log('checkpoint OK');

// 4. goal wins
await tp(0, 14.5, -156);
await page.waitForTimeout(1200);
const winVisible = await page.evaluate(() => !document.getElementById('win-screen').classList.contains('hidden'));
if (!winVisible) fails.push('goal did not trigger win screen');
else console.log('goal/win OK');
await page.screenshot({ path: 'test/shots/logic-win.png' });

await browser.close();
if (fails.length) { console.log('FAIL:\n' + fails.join('\n')); process.exit(1); }
console.log('ALL LOGIC OK');
