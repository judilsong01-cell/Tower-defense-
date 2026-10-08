import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ids = 'brasa,faisca,muralha,bastiao,lirio,corvo,falcao,trovao,peacekeeper,hound,riot,rifleman,drone,gunship,executor,incinerator,infiltrator,medic,armored,cleric'.split(',');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 520, height: 620 } });
for (const id of ids) {
  for (const [tag, yaw] of [['front', 0.55], ['back', -2.5]]) {
    await page.goto(`http://localhost:8765/render.html?id=${id}&yaw=${yaw}`);
    await page.waitForFunction(() => window.done === true, null, { timeout: 30000 });
    await page.locator('canvas').screenshot({ path: `r_${id}_${tag}.png`, omitBackground: true });
  }
}
await browser.close();
console.log('ok');
