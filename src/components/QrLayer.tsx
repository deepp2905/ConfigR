import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { renderQrImage, renderQrMaskUrl } from '../lib/qr'
import type { QrConfig, QrStyle } from '../state/store'

/** Preview-resolution QR; the export path regenerates at full native size. */
const PREVIEW_QR_PX = 560
const MIN_SCALE = 0.15
const MAX_SCALE = 0.6
const SNAP = 0.018

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type Corner = 'tl' | 'tr' | 'bl' | 'br'

interface QrLayerProps {
  url: string
  qr: QrConfig
  qrStyle: QrStyle
  /** Active shader palette colors (for duotone ink). */
  paletteColors: string[]
  selected: boolean
  aspect: number
  frameRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onChange: (patch: Partial<QrConfig>) => void
}

/** Module ink color for an image-based treatment. */
function inkFor(style: QrStyle, qr: QrConfig, paletteColors: string[]): string {
  if (style === 'duotone') return paletteColors[0] ?? qr.color
  if (style === 'frosted') return '#0b0b10'
  return qr.color // dots, grain
}

export function QrLayer({
  url,
  qr,
  qrStyle,
  paletteColors,
  selected,
  aspect,
  frameRef,
  onSelect,
  onChange,
}: QrLayerProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [maskUrl, setMaskUrl] = useState<string | null>(null)
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false })
  const revokeRef = useRef<string | null>(null)

  const ink = inkFor(qrStyle, qr, paletteColors)

  // Generate the QR resource for the current treatment.
  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      try {
        if (qrStyle === 'carved') {
          const mask = await renderQrMaskUrl({ data: url, size: PREVIEW_QR_PX, rounded: qr.rounded })
          if (cancelled) return
          setMaskUrl(mask)
          setImgSrc(null)
        } else {
          const img = await renderQrImage({
            data: url,
            size: PREVIEW_QR_PX,
            rounded: qr.rounded,
            color: ink,
            dotType: qrStyle === 'dots' ? 'dots' : qr.rounded ? 'rounded' : 'square',
          })
          if (cancelled) return
          if (revokeRef.current) URL.revokeObjectURL(revokeRef.current)
          revokeRef.current = img.src
          setImgSrc(img.src)
          setMaskUrl(null)
        }
      } catch {
        /* ignore transient generation errors */
      }
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [url, qrStyle, qr.rounded, ink])

  useEffect(() => () => void (revokeRef.current && URL.revokeObjectURL(revokeRef.current)), [])

  // ----- Drag to move (with center snap), corner handles to resize -----
  function beginDrag(e: ReactPointerEvent, mode: 'move' | Corner) {
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return

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
  const halfWpct = qr.scale * 50
  const halfHpct = qr.scale * 50 * aspect
  const radius = qr.rounded ? '7%' : '0'
  const blend = qr.blendMode === 'overlay' ? 'overlay' : undefined

  return (
    <>
      {guides.v && <span className="qr-guide v" />}
      {guides.h && <span className="qr-guide h" />}
      <div
        className={`qr-box ${selected ? 'is-selected' : ''}`}
        style={{
          left: `calc(${qr.posX * 100}% - ${halfWpct}%)`,
          top: `calc(${qr.posY * 100}% - ${halfHpct}%)`,
          width: `${qr.scale * 100}%`,
        }}
        onPointerDown={(e) => beginDrag(e, 'move')}
        role="button"
        aria-label="Drag to move the QR code"
      >
        {qrStyle === 'carved' && maskUrl && (
          <div
            className="qr-carve"
            style={{
              opacity: qr.opacity,
              borderRadius: radius,
              WebkitMaskImage: `url(${maskUrl})`,
              maskImage: `url(${maskUrl})`,
            }}
          />
        )}

        {qrStyle === 'frosted' && imgSrc && (
          <div className="qr-frost-wrap" style={{ opacity: qr.opacity }}>
            <div className="qr-frost" style={{ borderRadius: radius }} />
            <img className="qr-img" src={imgSrc} alt="QR code" draggable={false} />
          </div>
        )}

        {(qrStyle === 'duotone' || qrStyle === 'dots' || qrStyle === 'grain') && imgSrc && (
          <img
            className="qr-img"
            src={imgSrc}
            alt="QR code"
            draggable={false}
            style={{ opacity: qr.opacity, mixBlendMode: blend }}
          />
        )}

        {corners.map((c) => (
          <span key={c} className={`qr-handle ${c}`} onPointerDown={(e) => beginDrag(e, c)} />
        ))}
      </div>
    </>
  )
}
