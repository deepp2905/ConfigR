import { useEffect, useRef, useState } from 'react'
import { renderQrBlob } from '../lib/qr'
import type { QrConfig } from '../state/store'

/** Preview-resolution QR; the export path regenerates at full native size. */
const PREVIEW_QR_PX = 560

interface QrLayerProps {
  url: string
  qr: QrConfig
  color: string
}

export function QrLayer({ url, qr, color }: QrLayerProps) {
  const [src, setSrc] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        const blob = await renderQrBlob({
          data: url,
          size: PREVIEW_QR_PX,
          rounded: qr.rounded,
          color,
        })
        if (cancelled) return
        const objectUrl = URL.createObjectURL(blob)
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = objectUrl
        setSrc(objectUrl)
      } catch {
        /* ignore transient generation errors */
      }
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [url, qr.rounded, color])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  if (!src) return null

  return (
    <img
      className="qr-card"
      src={src}
      alt="QR code preview"
      style={{
        left: `${qr.posX * 100}%`,
        top: `${qr.posY * 100}%`,
        width: `${qr.scale * 100}%`,
      }}
    />
  )
}
