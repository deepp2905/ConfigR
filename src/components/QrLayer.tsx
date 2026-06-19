import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { renderQrBlob } from '../lib/qr'
import type { QrConfig } from '../state/store'

/** Preview-resolution QR; the export path regenerates at full native size. */
const PREVIEW_QR_PX = 560
const MIN_SCALE = 0.15
const MAX_SCALE = 0.6
/** Snap distance (fraction of frame) for center alignment. */
const SNAP = 0.018

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Corner = 'tl' | 'tr' | 'bl' | 'br'

interface QrLayerProps {
  /** Normalized URL to encode. */
  url: string
  qr: QrConfig
  selected: boolean
  frameRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onChange: (patch: Partial<QrConfig>) => void
}

export function QrLayer({ url, qr, selected, frameRef, onSelect, onChange }: QrLayerProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false })
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        const blob = await renderQrBlob({ data: url, size: PREVIEW_QR_PX, rounded: qr.rounded, color: qr.color })
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
  }, [url, qr.rounded, qr.color])

  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), [])

  // ----- Direct manipulation: drag to move (with center snap), corner handles to resize -----
  function beginDrag(e: ReactPointerEvent, mode: 'move' | Corner) {
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return

    // Force the matching cursor across the whole page for the duration of the drag,
    // so it stays consistent even when the pointer moves off the handle.
    const cursorClass =
      mode === 'move' ? 'qr-cur-grabbing' : mode === 'tl' || mode === 'br' ? 'qr-cur-nwse' : 'qr-cur-nesw'
    document.documentElement.classList.add(cursorClass)

    const startScale = qr.scale
    const startCenterX = qr.posX
    const startCenterY = qr.posY

    const onMove = (ev: PointerEvent) => {
      const nx = (ev.clientX - rect.left) / rect.width
      const ny = (ev.clientY - rect.top) / rect.height
      if (mode === 'move') {
        const halfX = startScale / 2
        const halfY = (startScale * rect.width) / rect.height / 2
        const snapV = Math.abs(nx - 0.5) < SNAP
        const snapH = Math.abs(ny - 0.5) < SNAP
        setGuides({ v: snapV, h: snapH })
        onChange({
          posX: snapV ? 0.5 : clamp(nx, halfX, 1 - halfX),
          posY: snapH ? 0.5 : clamp(ny, halfY, 1 - halfY),
        })
      } else {
        const cx = startCenterX * rect.width
        const cy = startCenterY * rect.height
        const half = Math.max(Math.abs(ev.clientX - rect.left - cx), Math.abs(ev.clientY - rect.top - cy))
        onChange({ scale: clamp((2 * half) / rect.width, MIN_SCALE, MAX_SCALE) })
      }
    }
    const onUp = () => {
      setGuides({ v: false, h: false })
      document.documentElement.classList.remove(cursorClass)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

  return (
    <>
      {guides.v && <span className="qr-guide v" />}
      {guides.h && <span className="qr-guide h" />}
      <div
        className={`qr-box ${selected ? 'is-selected' : ''}`}
        style={{
          left: `${qr.posX * 100}%`,
          top: `${qr.posY * 100}%`,
          width: `${qr.scale * 100}%`,
        }}
        onPointerDown={(e) => beginDrag(e, 'move')}
        role="button"
        aria-label="Drag to move the QR code"
      >
        {src && (
          <img
            className="qr-img"
            src={src}
            alt="QR code"
            draggable={false}
            style={{
              opacity: qr.opacity,
              mixBlendMode: qr.blendMode as React.CSSProperties['mixBlendMode'],
            }}
          />
        )}
        {corners.map((c) => (
          <span
            key={c}
            className={`qr-handle ${c}`}
            onPointerDown={(e) => beginDrag(e, c)}
          />
        ))}
      </div>
    </>
  )
}
