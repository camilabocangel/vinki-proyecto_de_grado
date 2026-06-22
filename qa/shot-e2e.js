// Captura recortada y legible del reporte Playwright: encabezado con el
// resumen 47/47 (Passed verde, Failed 0) + listado de casos en verde.
const { chromium } = require('@playwright/test')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
;(async () => {
  const out = process.argv[2] || 'qa/reporte-e2e-playwright.png'
  const clipH = Number(process.argv[3]) || 980
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1180, height: clipH + 40 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.goto(pathToFileURL(path.resolve('playwright-report/index.html')).href, {
    waitUntil: 'networkidle',
  })
  await page.evaluate(() => {
    document.documentElement.style.background = '#ffffff'
    document.body.style.background = '#ffffff'
  })
  await page.waitForTimeout(800)
  // Recorta desde el contenedor central (x≈150, ancho≈980) e incluye el nav
  // superior con los contadores 47/47. y=8 captura la barra de navegación.
  await page.screenshot({
    path: path.resolve(out),
    clip: { x: 116, y: 8, width: 1020, height: clipH },
  })
  await browser.close()
  console.log('OK ->', out)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
