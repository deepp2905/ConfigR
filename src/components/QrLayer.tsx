import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { renderQrBlob } from '../lib/qr'
import type { QrConfig } from '../state/store'

/** Preview-resolution QR; the export path regenerates at full native size. */
const PREVIEW_QR_PX = 560
const MIN_SCALE = 0.15
const MAX_SCALE = 0.6

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Corner = 'tl' | 'tr' | 'bl' | 'br'

interface QrLayerProps {
  /** Normalized URL to encode. */
  url: string
  qr: QrConfig
  color: string
  frameRef: React.RefObject<HTMLDivElement | null>
  onChange: (patch: Partial<QrConfig>) => void
}

export function QrLayer({ url, qr, color, frameRef, onChange }: QrLayerProps) {
  const [src, setSrc] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        const blob = await renderQrBlob({ data: url, size: PREVIEW_QR_PX, rounded: qr.rounded, color })
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

  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), [])

  // ----- Direct manipulation: drag to move, corner handles to resize -----
  function beginDrag(e: ReactPointerEvent, mode: 'move' | Corner) {
    e.preventDefault()
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return

    const startScale = qr.scale
    const startCenterX = qr.posX
    const startCenterY = qr.posY

    const onMove = (ev: PointerEvent) => {
      const nx = (ev.clientX - rect.left) / rect.width
      const ny = (ev.clientY - rect.top) / rect.height
      if (mode === 'move') {
        const halfX = startScale / 2
        const halfY = (startScale * rect.width) / rect.height / 2
        onChange({
          posX: clamp(nx, halfX, 1 - halfX),
          posY: clamp(ny, halfY, 1 - halfY),
        })
      } else {
        // Resize around the fixed center: use the larger axis distance to keep it square.
        const cx = startCenterX * rect.width
        const cy = startCenterY * rect.height
        const half = Math.max(Math.abs(ev.clientX - rect.left - cx), Math.abs(ev.clientY - rect.top - cy))
        onChange({ scale: clamp((2 * half) / rect.width, MIN_SCALE, MAX_SCALE) })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

  return (
    <div
      className="qr-box"
      style={{ left: `${qr.posX * 100}%`, top: `${qr.posY * 100}%`, width: `${qr.scale * 100}%` }}
      onPointerDown={(e) => beginDrag(e, 'move')}
      role="button"
      aria-label="Drag to move the QR code"
    >
      {src && <img className="qr-img" src={src} alt="QR code" draggable={false} />}
      {corners.map((c) => (
        <span
          key={c}
          className={`qr-handle ${c}`}
          onPointerDown={(e) => {
            e.stopPropagation()
            beginDrag(e, c)
          }}
        />
      ))}
    </div>
  )
}
