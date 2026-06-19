import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'd:/Design Engineering/configQR/verify-out'
fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewport({ width: 1180, height: 980, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1200))
await page.type('.hero-input', 'figma.com/config')
await new Promise((r) => setTimeout(r, 700))
await page.waitForSelector('.qr-box', { timeout: 5000 })

// 2. knob size + no purple; style active white; focus white
const thumb = await page.evaluate(() => {
  const i = document.querySelector('.slider input[type=range]')
  // can't read pseudo-element directly; read CSS rule via a probe is hard. Check rule text instead.
  return null
})
const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText) } catch { return [] } }).join('\n'))
const knobBig = /::-webkit-slider-thumb[^}]*width:\s*22px/.test(css)
const knobNoPurple = !/::-webkit-slider-thumb[^}]*7c5cff/i.test(css)
const styleActiveWhite = /style-tile\.is-active \.style-thumb[^}]*#fff/i.test(css) || /style-tile\.is-active \.style-thumb[^}]*rgb\(255, 255, 255\)/i.test(css)
console.log('2) knob 22px:', knobBig, '| knob no purple:', knobNoPurple, '| style active white:', styleActiveWhite)
const focusShadow = await page.evaluate(() => { const el = document.querySelector('.hero-input'); el.focus(); return getComputedStyle(el).boxShadow })
console.log('   link focus shadow (should be white-ish):', focusShadow)

// 1. cursor persists during drag — check html class while dragging
const box = await page.$('.qr-box'); const bb = await box.boundingBox()
await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2)
await new Promise((r) => setTimeout(r, 100))
const br = await page.$('.qr-handle.br'); const hb = await br.boundingBox()
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
await page.mouse.down()
await page.mouse.move(hb.x + 60, hb.y + 60, { steps: 4 })
const clsDuring = await page.evaluate(() => document.documentElement.className)
const cursorDuring = await page.evaluate(() => getComputedStyle(document.body).cursor)
await page.mouse.up()
const clsAfter = await page.evaluate(() => document.documentElement.className)
console.log('1) html class during resize:', JSON.stringify(clsDuring), '| body cursor:', cursorDuring, '| class after up:', JSON.stringify(clsAfter))

// 3. click anywhere in viewport (on controls panel) hides outline
await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) // reselect
await new Promise((r) => setTimeout(r, 100))
const selBefore = await page.$eval('.qr-box', (el) => el.classList.contains('is-selected'))
await page.mouse.click(1000, 120) // somewhere in the controls panel (outside frame)
await new Promise((r) => setTimeout(r, 120))
const selAfter = await page.$eval('.qr-box', (el) => el.classList.contains('is-selected'))
console.log('3) selected before outside-viewport click:', selBefore, '-> after:', selAfter)

console.log('ERRORS:', errors.length ? JSON.stringify(errors) : 'none')
await browser.close()
