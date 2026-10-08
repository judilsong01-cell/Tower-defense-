// High-detail idle animations of the operators for the menus (start screen, squad).
// Same framing as the 192 px game sheets, rendered 3x larger (576 px frames).
// Usage (server on 8765 as in README): node portraits.mjs && python3 build_portraits.py
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OPS = ['brasa', 'faisca', 'muralha', 'bastiao', 'lirio', 'corvo', 'falcao', 'trovao'];
const ZOOM = 3, PX = 192 * ZOOM, N = 8;
fs.mkdirSync('portrait', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: PX, height: PX } });
page.on('pageerror', (e) => console.log('error', e.message));
for (const id of OPS) {
  await page.goto(`http://localhost:8765/sheet.html?id=${id}&px=${PX}&zoom=${ZOOM}`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 30000 });
  for (let i = 0; i < N; i++) {
    const url = await page.evaluate(([a, t]) => window.frame(a, t), ['idle', i / N]);
    fs.writeFileSync(`portrait/${id}_${i}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
}
await browser.close();
console.log('ok');
