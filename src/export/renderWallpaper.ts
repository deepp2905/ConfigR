import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { ConfigState } from '../state/store'
import { getDevice } from '../devices/presets'
import { getShader, buildShaderProps } from '../shaders/registry'
import { resolveQrColor } from '../lib/qrColor'
import { renderQrBlob, blobToImage } from '../lib/qr'

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
  const palette = def.palettes.find((p) => p.id === state.paletteId) ?? def.palettes[0]
  const shaderProps = buildShaderProps(def, palette, state.params)
  const { width: w, height: h } = device

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-100000px;top:0;width:${w}px;height:${h}px;pointer-events:none;`
  document.body.appendChild(container)
  const root = createRoot(container)

  try {
    root.render(
      createElement(def.Component, {
        ...shaderProps,
        speed: 0,
        frame: state.seed,
        minPixelRatio: 1,
        maxPixelCount: w * h + 4096,
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

    const color = resolveQrColor({
      mode: state.qr.colorMode,
      manualColor: state.qr.manualColor,
      backgroundLuminance: state.backgroundLuminance,
    })
    const qrSize = Math.round(state.qr.scale * w)
    const qrBlob = await renderQrBlob({
      data: state.url,
      size: qrSize,
      rounded: state.qr.rounded,
      color,
    })
    const qrImg = await blobToImage(qrBlob)

    const qx = Math.round(state.qr.posX * w - qrSize / 2)
    const qy = Math.round(state.qr.posY * h - qrSize / 2)

    // Transparent QR drawn directly over the shader (no plate, no shadow), honoring blend mode.
    ctx.save()
    ctx.globalCompositeOperation =
      state.qr.blendMode === 'normal'
        ? 'source-over'
        : (state.qr.blendMode as GlobalCompositeOperation)
    ctx.drawImage(qrImg, qx, qy, qrSize, qrSize)
    ctx.restore()

    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'))
    if (!blob) throw new Error('PNG encode failed')
    triggerDownload(blob, `configr-${device.id}-${w}x${h}.png`)
  } finally {
    root.unmount()
    container.remove()
  }
}
