import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { ConfigState } from '../state/store'
import { getDevice } from '../devices/presets'
import { getShader, getPalette, buildShaderProps } from '../shaders/registry'
import { normalizeUrl } from '../lib/url'
import { renderQrImage } from '../lib/qr'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rgba(hex: string, a: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: number) {
  const rr = Math.min(r, s / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + s, y, x + s, y + s, rr)
  ctx.arcTo(x + s, y + s, x, y + s, rr)
  ctx.arcTo(x, y + s, x, y, rr)
  ctx.arcTo(x, y, x + s, y, rr)
  ctx.closePath()
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function waitForCanvas(container: HTMLElement): Promise<HTMLCanvasElement> {
  for (let i = 0; i < 60; i++) {
    const canvas = container.querySelector('canvas')
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      // Give the shader a few frames to actually paint into the preserved buffer.
      await nextFrame()
      await nextFrame()
      await delay(120)
      return canvas
    }
    await nextFrame()
  }
  throw new Error('Shader canvas did not render in time')
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Render the wallpaper at the device's native resolution and download it as a crisp PNG.
 * The shader is mounted off-screen at full pixel size with a preserved drawing buffer,
 * frozen on the same seed/frame as the (static) preview, then the QR is composited on top.
 */
export async function exportWallpaper(state: ConfigState): Promise<void> {
  const device = getDevice(state.deviceId)
  const def = getShader(state.shaderId)
  const palette = getPalette(state.paletteId)
  const shaderProps = buildShaderProps(def, palette, state.params)
  const { width: w, height: h } = device

  // The shaders size their pattern relative to the render resolution, so rendering at the
  // full native device resolution makes the pattern look smaller / "zoomed out" compared to
  // the small on-screen preview. Render the export shader at the *preview frame's* pixel size
  // (same dimensions the user sees) so the framing matches, then upscale to native when
  // compositing. The QR is still drawn at full native size, so it stays crisp.
  const previewFrame = document.querySelector('.phone-frame') as HTMLElement | null
  const previewW = previewFrame?.clientWidth ?? 390
  const renderW = Math.max(1, Math.round(previewW))
  const renderH = Math.max(1, Math.round((renderW * h) / w))

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-100000px;top:0;width:${renderW}px;height:${renderH}px;pointer-events:none;`
  document.body.appendChild(container)
  const root = createRoot(container)

  try {
    root.render(
      createElement(def.Component, {
        ...shaderProps,
        speed: 0,
        frame: state.seed,
        webGlContextAttributes: { preserveDrawingBuffer: true },
        style: { width: '100%', height: '100%' },
      }),
    )

    const shaderCanvas = await waitForCanvas(container)

    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')

    ctx.drawImage(shaderCanvas, 0, 0, w, h)

    const data = normalizeUrl(state.url)
    if (data) {
      const style = state.qrStyle
      const qrSize = Math.round(state.qr.scale * w)
      const qx = Math.round(state.qr.posX * w - qrSize / 2)
      const qy = Math.round(state.qr.posY * h - qrSize / 2)
      const rad = qrSize * 0.07

      const qrImg = await renderQrImage({
        data,
        size: qrSize,
        rounded: true,
        color: state.qr.color,
        dotType: style === 'dots' ? 'dots' : 'rounded',
      })

      // Build the treatment into a transparent temp canvas so opacity + blend can be applied
      // uniformly to the whole result.
      const qc = document.createElement('canvas')
      qc.width = qrSize
      qc.height = qrSize
      const qctx = qc.getContext('2d')!
      if (style === 'dynamic') {
        // Gaps: chosen color at full opacity; modules: crisp shader showing through.
        qctx.save()
        roundRectPath(qctx, 0, 0, qrSize, rad)
        qctx.clip()
        qctx.drawImage(shaderCanvas, 0, 0, shaderCanvas.width, shaderCanvas.height, -qx, -qy, w, h)
        qctx.fillStyle = rgba(state.qr.color, 1)
        qctx.fillRect(0, 0, qrSize, qrSize)
        qctx.restore()
        const mod = document.createElement('canvas')
        mod.width = qrSize
        mod.height = qrSize
        const mctx = mod.getContext('2d')!
        mctx.drawImage(shaderCanvas, 0, 0, shaderCanvas.width, shaderCanvas.height, -qx, -qy, w, h)
        mctx.globalCompositeOperation = 'destination-in'
        mctx.drawImage(qrImg, 0, 0, qrSize, qrSize)
        qctx.drawImage(mod, 0, 0)
      } else {
        qctx.drawImage(qrImg, 0, 0, qrSize, qrSize)
      }

      ctx.save()
      ctx.globalAlpha = state.qr.opacity
      if (state.qr.blendMode === 'overlay') ctx.globalCompositeOperation = 'overlay'
      ctx.drawImage(qc, qx, qy)
      ctx.restore()
    }

    // Config wordmark watermark — half width, bottom-center, 16px (scaled) gap, Overlay blend.
    try {
      const logo = await loadImage('/config.svg')
      const frameW = (document.querySelector('.phone-frame') as HTMLElement | null)?.clientWidth
      const logoW = Math.round(w * 0.5)
      const logoH = Math.round(logoW * (197 / 870))
      const gap = Math.round(16 * (frameW ? w / frameW : 3))
      const lx = Math.round((w - logoW) / 2)
      const ly = h - logoH - gap
      // Recolor the glyph white, preserving its alpha.
      const lc = document.createElement('canvas')
      lc.width = logoW
      lc.height = logoH
      const lcx = lc.getContext('2d')!
      lcx.drawImage(logo, 0, 0, logoW, logoH)
      lcx.globalCompositeOperation = 'source-in'
      lcx.fillStyle = state.qr.color
      lcx.fillRect(0, 0, logoW, logoH)
      ctx.save()
      ctx.globalAlpha = state.qr.opacity
      ctx.globalCompositeOperation =
        state.qr.blendMode === 'overlay' ? 'overlay' : 'source-over'
      ctx.drawImage(lc, lx, ly)
      ctx.restore()
    } catch {
      /* logo is decorative; skip if it fails to load */
    }

    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'))
    if (!blob) throw new Error('PNG encode failed')
    triggerDownload(blob, `configr-${device.id}-${w}x${h}.png`)
  } finally {
    root.unmount()
    container.remove()
  }
}
