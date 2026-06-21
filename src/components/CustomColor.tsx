import { useEffect, useRef, useState } from 'react'
import { PlusIcon } from './PlusIcon'

const HEX_RE = /^[0-9a-fA-F]{6}$/
const withHash = (v: string) => (v.startsWith('#') ? v : `#${v}`)

interface CustomColorProps {
  value: string
  isActive: boolean
  onChange: (hex: string) => void
}

/** Custom QR color: a themed HEX-first popover with a native picker as a secondary swatch. */
export function CustomColor({ value, isActive, onChange }: CustomColorProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value.replace('#', ''))
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => setText(value.replace('#', '')), [value])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onHexInput(raw: string) {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setText(clean)
    if (HEX_RE.test(clean)) onChange(withHash(clean))
  }

  const preview = HEX_RE.test(text) ? withHash(text) : value

  return (
    <div className="cc" ref={ref}>
      <button
        type="button"
        className={`swatch qr-dot qr-dot-custom ${isActive ? 'is-active' : ''}`}
        data-label="Custom color"
        aria-label="Custom color"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={isActive ? { background: value } : undefined}
      >
        {!isActive && <PlusIcon />}
      </button>

      {open && (
        <div className="cc-pop" role="dialog" aria-label="Custom color">
          <span className="cc-preview" style={{ background: preview }} />
          <span className="cc-hash" aria-hidden>
            #
          </span>
          <input
            className="cc-input"
            value={text}
            onChange={(e) => onHexInput(e.target.value)}
            placeholder="RRGGBB"
            spellCheck={false}
            autoFocus
            aria-label="Hex color"
          />
          <label className="cc-native" aria-label="Pick visually">
            <input
              type="color"
              value={HEX_RE.test(text) ? withHash(text) : value}
              onChange={(e) => onHexInput(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
