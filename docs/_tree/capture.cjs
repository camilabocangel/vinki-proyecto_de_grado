const { chromium } = require('../../frontend/app/node_modules/playwright');
const path = require('path');

(async () => {
  const htmlPath = 'file://' + path.resolve(__dirname, 'estructura.html');
  const out = path.resolve(__dirname, '../../estructura-carpetas.png');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto(htmlPath, { waitUntil: 'networkidle' });

  const el = await page.$('#capture');
  await el.screenshot({ path: out });

  const box = await el.boundingBox();
  console.log(`OK -> ${out}  (${Math.round(box.width)}x${Math.round(box.height)} CSS px, @2x = ${Math.round(box.width*2)}x${Math.round(box.height*2)})`);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
