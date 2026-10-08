import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OPS = ['brasa', 'faisca', 'muralha', 'bastiao', 'lirio', 'corvo', 'falcao', 'trovao'];
const ENS = ['peacekeeper', 'hound', 'riot', 'rifleman', 'drone', 'gunship', 'executor', 'incinerator', 'infiltrator', 'medic', 'armored', 'cleric'];
const PX = 192, N = 8;
fs.mkdirSync('export', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: PX, height: PX } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const id of [...OPS, ...ENS]) {
  await page.goto(`http://localhost:8765/sheet.html?id=${id}&px=${PX}`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 30000 });
  const rows = OPS.includes(id) ? ['idle', 'attack'] : ['move', 'attack'];
  for (const [r, anim] of rows.entries()) {
    for (let i = 0; i < N; i++) {
      const url = await page.evaluate(([a, t]) => window.frame(a, t), [anim, i / N]);
      fs.writeFileSync(`export/${id}_${r}_${i}.png`, Buffer.from(url.split(',')[1], 'base64'));
    }
  }
}
console.log('errors', JSON.stringify(errors));
await browser.close();
