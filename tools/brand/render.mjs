// Renders the MUXIMA logo, app icons and splash screens from brand.html.
// Usage (from the project root): node tools/brand/render.mjs   (needs Playwright)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const res = `${root}/android/app/src/main/res`;
const out = [];
const add = (view, w, h, path) => out.push({ view, w, h: h ?? w, path });

add('icon3', 1024, 1024, `${root}/assets/icon.png`);
add('icon3', 512, 512, `${root}/docs/play-console/icone_app_512.png`);
add('splash', 2732, 2732, `${root}/assets/splash.png`);
add('logo', 1080, 300, `${root}/public/assets/ui/logo.png`);
for (const [d, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  add('icon3', s, s, `${res}/mipmap-${d}/ic_launcher.png`);
  add('round3', s, s, `${res}/mipmap-${d}/ic_launcher_round.png`);
  add('fg3', s * 2.25, s * 2.25, `${res}/mipmap-${d}/ic_launcher_foreground.png`);
}
for (const [d, w, h] of [['mdpi', 480, 320], ['hdpi', 800, 480], ['xhdpi', 1280, 720], ['xxhdpi', 1600, 960], ['xxxhdpi', 1920, 1280]]) {
  add('splash', w, h, `${res}/drawable-land-${d}/splash.png`);
  add('splash', h, w, `${res}/drawable-port-${d}/splash.png`);
}
add('splash', 480, 320, `${res}/drawable/splash.png`);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const o of out) {
  await page.setViewportSize({ width: o.w, height: o.h });
  await page.goto(`file://${here}/brand.html?view=${o.view}&w=${o.w}&h=${o.h}`);
  await page.waitForFunction(() => window.done === true);
  mkdirSync(dirname(o.path), { recursive: true });
  await page.locator('#stage > svg').screenshot({ path: o.path, omitBackground: true });
}
await browser.close();
console.log(`rendered ${out.length} images`);
