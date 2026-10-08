import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
// Renders stage maps to JPEG. Usage: node mapexport.mjs [l1,l2,...|all] [outDir]
const all = JSON.parse(readFileSync('levels.json', 'utf8')).map((l) => l.id);
const ids = !process.argv[2] || process.argv[2] === 'all' ? all : process.argv[2].split(',');
const outDir = process.argv[3] || '../../public/assets/maps';
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
for (const id of ids) {
  await page.goto('http://localhost:8765/mapshot.html');
  await page.waitForFunction(() => window.done === true, null, { timeout: 60000 });
  const t = Date.now();
  const url = await page.evaluate((id) => window.render(id), id);
  writeFileSync(`${outDir}/${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(id, Date.now() - t, 'ms');
}
await browser.close();
