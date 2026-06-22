// Renderiza un HTML con Mermaid a PNG de alta resolución, fondo blanco.
// Uso: node qa/render-mermaid.js <htmlRelPath> <outPng> [scaleFactor]
// Fuerza el SVG a su tamaño intrínseco (viewBox) para evitar el max-width
// que Mermaid aplica y que reduce la imagen.
const { chromium } = require('@playwright/test')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
;(async () => {
  const html = process.argv[2] || 'qa/diagram.html'
  const out = process.argv[3] || 'docs/graficos/diagrama-cicd-despliegue.png'
  const scale = Number(process.argv[4]) || 3
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ deviceScaleFactor: scale })
  const page = await ctx.newPage()
  await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__done === true, { timeout: 30000 })
  const err = await page.evaluate(() => window.__err || null)
  if (err) {
    console.error('MERMAID ERROR:', err)
    await browser.close()
    process.exit(1)
  }
  await page.waitForSelector('#wrap svg', { timeout: 10000 })
  // Normaliza el SVG a su tamaño real según el viewBox y elimina max-width.
  const size = await page.evaluate(() => {
    const svg = document.querySelector('#wrap svg')
    const vb = svg.viewBox.baseVal
    const w = Math.ceil(vb.width)
    const h = Math.ceil(vb.height)
    svg.style.maxWidth = 'none'
    svg.style.width = w + 'px'
    svg.style.height = h + 'px'
    svg.setAttribute('width', w)
    svg.setAttribute('height', h)
    return { w, h }
  })
  await page.waitForTimeout(150)
  const wrap = await page.$('#wrap')
  await wrap.screenshot({ path: path.resolve(out) })
  console.log('OK ->', out, '| svg intrínseco:', size.w + 'x' + size.h, '| scale', scale)
  await browser.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
