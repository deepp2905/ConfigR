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
await page.goto('http://localhost:5185/', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1200))
await page.type('.hero-input', 'figma.com/config')
await new Promise((r) => setTimeout(r, 600))
await page.waitForSelector('.qr-box', { timeout: 5000 })
// deselect to remove outline/handles from screenshot
await page.mouse.click(1000, 130)
await new Promise((r) => setTimeout(r, 150))

const box = await page.$('.qr-box')
async function frameShot(name) {
  const bb = await box.boundingBox()
  return await page.screenshot({ clip: { x: Math.round(bb.x), y: Math.round(bb.y), width: Math.round(bb.width), height: Math.round(bb.height) }, encoding: 'binary', path: OUT + '/' + name })
}
async function setBlend(v) {
  await page.evaluate((val) => {
    // open the blend dropdown (the one in select-row) and click matching option
    const trig = document.querySelector('.select-row .ui-select-trigger'); trig.click()
  }, v)
  await new Promise((r) => setTimeout(r, 120))
  await page.evaluate((val) => {
    const o = [...document.querySelectorAll('.ui-select-option')].find((e) => e.textContent.trim().toLowerCase() === val)
    o && o.click()
  }, v)
  await new Promise((r) => setTimeout(r, 250))
}

// Compare PNG byte length & a crude content hash of QR region across blend modes
function buf2hash(b) { let h = 0; for (let i = 0; i < b.length; i += 7) h = (h * 31 + b[i]) >>> 0; return h }

await setBlend('normal'); const a = fs.readFileSync(OUT + '/.tmp', 'utf8') || ''
await setBlend('normal'); const nNormal = await frameShot('blend-normal.png')
await setBlend('difference'); const nDiff = await frameShot('blend-difference.png')
await setBlend('overlay'); const nOver = await frameShot('blend-overlay.png')
await setBlend('multiply'); const nMul = await frameShot('blend-multiply.png')

console.log('sizes  normal:', nNormal.length, 'difference:', nDiff.length, 'overlay:', nOver.length, 'multiply:', nMul.length)
console.log('hash   normal:', buf2hash(nNormal), 'difference:', buf2hash(nDiff), 'overlay:', buf2hash(nOver), 'multiply:', buf2hash(nMul))
console.log('normal != difference:', buf2hash(nNormal) !== buf2hash(nDiff))
console.log('normal != overlay   :', buf2hash(nNormal) !== buf2hash(nOver))

console.log('ERRORS:', errors.length ? JSON.stringify(errors) : 'none')
await browser.close()
