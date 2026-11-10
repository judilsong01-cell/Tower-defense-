import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
// Renders the battle backgrounds and records each stage's camera for the game.
// Usage: node arkexport.mjs [l1,l2,...|all] [outDir]
const all = JSON.parse(readFileSync('levels.json', 'utf8')).map((l) => l.id);
const ids = !process.argv[2] || process.argv[2] === 'all' ? all : process.argv[2].split(',');
const outDir = process.argv[3] || '../../public/assets/maps';
const viewsFile = '../../src/data/mapViews.json';
mkdirSync(outDir, { recursive: true });
const views = existsSync(viewsFile) ? JSON.parse(readFileSync(viewsFile, 'utf8')) : {};
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
for (const id of ids) {
  await page.goto('http://localhost:8765/arkexport.html');
  await page.waitForFunction(() => window.done === true, null, { timeout: 60000 });
  const t = Date.now();
  const { url, view } = await page.evaluate((id) => window.render(id), id);
  writeFileSync(`${outDir}/${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  views[id] = view;
  console.log(id, `${view.w}x${view.h}`, Date.now() - t, 'ms');
}
const sorted = Object.fromEntries(all.filter((id) => views[id]).map((id) => [id, views[id]]));
writeFileSync(viewsFile, JSON.stringify(sorted, null, 1) + '\n');
await browser.close();
