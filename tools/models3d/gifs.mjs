import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const ids = (process.argv[2] || 'brasa').split(',');
const W = +(process.argv[3] || 300), H = +(process.argv[4] || 360);
fs.mkdirSync('frames', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const id of ids) {
  await page.goto(`http://localhost:8765/render.html?id=${id}&anim=1&w=${W}&h=${H}&bg=%2322242d`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 30000 });
  // sequence: movement loop x2 (2 x 10 frames) then attack (12 frames) then movement x1
  const seq = [];
  for (let k = 0; k < 2; k++) for (let i = 0; i < 10; i++) seq.push(['move', i / 10]);
  for (let i = 0; i < 12; i++) seq.push(['attack', i / 12]);
  for (let i = 0; i < 10; i++) seq.push(['move', i / 10]);
  let n = 0;
  for (const [anim, t] of seq) {
    const url = await page.evaluate(([a, tt]) => window.frame(a, tt), [anim, t]);
    fs.writeFileSync(`frames/${id}_${String(n++).padStart(3, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
}
console.log('errors', JSON.stringify(errors));
await browser.close();
