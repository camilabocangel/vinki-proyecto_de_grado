// Captura de reportes HTML como PNG limpio para la tesis.
// Uso: node qa/shot.js <fileHtml> <salida.png> [selector] [width]
// - Si se pasa selector, captura solo ese elemento (recorte limpio).
// - deviceScaleFactor: 2 -> alta resolución. Fondo blanco forzado.
const { chromium } = require('@playwright/test')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

async function main() {
  const [file, out, selector, width] = process.argv.slice(2)
  if (!file || !out) {
    console.error('Uso: node qa/shot.js <fileHtml> <salida.png> [selector] [width]')
    process.exit(1)
  }
  const url = pathToFileURL(path.resolve(file)).href
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: Number(width) || 1200, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  // Fondo blanco garantizado (algunos reportes no fijan body bg).
  await page.evaluate(() => {
    document.documentElement.style.background = '#ffffff'
    document.body.style.background = '#ffffff'
  })
  await page.waitForTimeout(800)
  if (selector) {
    const el = await page.waitForSelector(selector, { timeout: 15000 })
    await el.screenshot({ path: path.resolve(out) })
  } else {
    await page.screenshot({ path: path.resolve(out), fullPage: true })
  }
  await browser.close()
  console.log('OK ->', out)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
