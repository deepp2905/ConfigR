import QRCodeStyling from 'qr-code-styling'

export interface QrRenderOptions {
  data: string
  /** Pixel size of the square QR image. */
  size: number
  rounded: boolean
  /** Module (foreground) color; the background is transparent. */
  color: string
}

/**
 * Render a QR code to a PNG blob at an exact pixel size, with a transparent background.
 * High error correction keeps it scannable even with rounded modules over a shader.
 */
export async function renderQrBlob(opts: QrRenderOptions): Promise<Blob> {
  const margin = Math.round(opts.size * 0.04)
  const qr = new QRCodeStyling({
    type: 'canvas',
    width: opts.size,
    height: opts.size,
    data: opts.data || ' ',
    margin,
    qrOptions: { errorCorrectionLevel: 'H' },
    backgroundOptions: { color: 'transparent' },
    dotsOptions: { color: opts.color, type: opts.rounded ? 'rounded' : 'square' },
    cornersSquareOptions: { color: opts.color, type: opts.rounded ? 'extra-rounded' : 'square' },
    cornersDotOptions: { color: opts.color, type: opts.rounded ? 'dot' : 'square' },
  })
  const raw = await qr.getRawData('png')
  if (!raw) throw new Error('QR generation failed')
  return raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: 'image/png' })
}

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}
