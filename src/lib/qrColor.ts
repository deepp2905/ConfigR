/** Color utilities + adaptive QR coloring based on the shader behind the QR. */

const LIGHT = '#f6f6fb'
const DARK = '#0b0b10'

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function channelLin(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(channelLin)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function luminanceOfHex(hex: string): number {
  return relativeLuminance(hexToRgb(hex))
}

/**
 * Average luminance of a normalized region (0..1 coords) of a canvas. Reads pixels
 * via a downscaled 2D copy so it works for both WebGL and 2D source canvases.
 */
export function sampleRegionLuminance(
  source: HTMLCanvasElement,
  region: { x: number; y: number; w: number; h: number },
): number | null {
  const sw = source.width
  const sh = source.height
  if (!sw || !sh) return null

  const sx = Math.max(0, Math.floor(region.x * sw))
  const sy = Math.max(0, Math.floor(region.y * sh))
  const cw = Math.max(1, Math.floor(region.w * sw))
  const ch = Math.max(1, Math.floor(region.h * sh))

  // Downscale the region into a tiny canvas; one read, cheap average.
  const sample = document.createElement('canvas')
  const N = 12
  sample.width = N
  sample.height = N
  const ctx = sample.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  try {
    ctx.drawImage(source, sx, sy, cw, ch, 0, 0, N, N)
    const data = ctx.getImageData(0, 0, N, N).data
    let sum = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += relativeLuminance([data[i], data[i + 1], data[i + 2]])
      count++
    }
    return count ? sum / count : null
  } catch {
    return null
  }
}

/**
 * Pick the QR module color (the QR background is transparent — no plate). In auto mode the
 * color is derived from the shader luminance behind the QR: white on dark, black on light.
 * In manual mode the user fixes the color.
 */
export function resolveQrColor(opts: {
  mode: 'auto' | 'manual'
  manualColor: string
  backgroundLuminance: number | null
}): string {
  if (opts.mode === 'manual') return opts.manualColor
  const bg = opts.backgroundLuminance ?? 0
  return bg < 0.5 ? LIGHT : DARK
}
