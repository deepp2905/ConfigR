import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'd:/Design Engineering/configQR/verify-out'
fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.setViewport({ width: 1180, height: 940, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
await page.goto('http://localhost:5180/', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1800))
const grid = await page.$('.style-grid')
await grid.screenshot({ path: OUT + '/tiles.png' })
console.log('ERRORS:', errors.length ? JSON.stringify(errors) : 'none')
await browser.close()
