import QRCodeStyling from 'qr-code-styling'

export type DotType = 'rounded' | 'square' | 'dots'

export interface QrRenderOptions {
  data: string
  /** Pixel size of the square QR image. */
  size: number
  rounded: boolean
  /** Module (foreground) color; the background is transparent. */
  color: string
  /** Override the module shape (defaults from `rounded`). */
  dotType?: DotType
}

/**
 * Render a QR code to a PNG blob at an exact pixel size, with a transparent background.
 * High error correction keeps it scannable even with rounded modules over a shader.
 */
export async function renderQrBlob(opts: QrRenderOptions): Promise<Blob> {
  const margin = Math.round(opts.size * 0.04)
  const dot: DotType = opts.dotType ?? (opts.rounded ? 'rounded' : 'square')
  const corner = dot === 'square' ? 'square' : 'extra-rounded'
  const qr = new QRCodeStyling({
    type: 'canvas',
    width: opts.size,
    height: opts.size,
    data: opts.data || ' ',
    margin,
    qrOptions: { errorCorrectionLevel: 'H' },
    backgroundOptions: { color: 'transparent' },
    dotsOptions: { color: opts.color, type: dot },
    cornersSquareOptions: { color: opts.color, type: corner },
    cornersDotOptions: { color: opts.color, type: dot === 'square' ? 'square' : 'dot' },
  })
  const raw = await qr.getRawData('png')
  if (!raw) throw new Error('QR generation failed')
  return raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: 'image/png' })
}

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/** Render a QR straight to an HTMLImageElement. */
export async function renderQrImage(opts: QrRenderOptions): Promise<HTMLImageElement> {
  return blobToImage(await renderQrBlob(opts))
}

/**
 * Produce an inverted-alpha QR: opaque everywhere except module-shaped holes. Used as a CSS
 * mask (or canvas plate) for the "carved" treatment so the shader shows through the modules.
 */
export async function renderQrMaskUrl(opts: Omit<QrRenderOptions, 'color'>): Promise<string> {
  const modules = await renderQrImage({ ...opts, color: '#000000' })
  const c = document.createElement('canvas')
  c.width = modules.width
  c.height = modules.height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(modules, 0, 0)
  return c.toDataURL()
}
