import { useEffect, useRef, useState } from 'react'
import { PlusIcon } from './PlusIcon'

const HEX_RE = /^[0-9a-fA-F]{6}$/
const withHash = (v: string) => (v.startsWith('#') ? v : `#${v}`)

interface CustomColorProps {
  /** Seed value shown when the popover opens. */
  value: string
  /** Live preview as the user types/picks. */
  onChange: (hex: string) => void
  /** Finalized color (popover closed with a valid hex) — persist it as a swatch. */
  onCommit: (hex: string) => void
}

/** "Add custom color" button + themed HEX-first popover. */
export function CustomColor({ value, onChange, onCommit }: CustomColorProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value.replace('#', ''))
  const ref = useRef<HTMLDivElement | null>(null)

  function close() {
    setOpen(false)
    if (HEX_RE.test(text)) onCommit(withHash(text))
  }

  useEffect(() => {
    if (!open) return
    setText(value.replace('#', ''))
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text])

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
        className="swatch qr-dot qr-dot-custom"
        data-label="Add color"
        aria-label="Add custom color"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <PlusIcon />
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
