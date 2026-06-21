import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
fs.mkdirSync('verify-out', { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewport({ width: 1180, height: 1000, deviceScaleFactor: 2 })
await page.goto('http://localhost:5191/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1300))
const frame = await page.$('.phone-frame')
for (const n of ['Citrus', 'Volt', 'Electric']) {
  await page.evaluate((label) => { const sw = [...document.querySelectorAll('.swatches .swatch')].find((b) => (b.getAttribute('aria-label') || b.title) === label); sw && sw.click() }, n)
  await new Promise((r) => setTimeout(r, 500))
  const bb = await frame.boundingBox()
  await page.screenshot({ path: `verify-out/p-${n}.png`, clip: { x: Math.round(bb.x), y: Math.round(bb.y), width: Math.round(bb.width), height: Math.round(bb.height * 0.45) } })
}
await browser.close()
console.log('done')
