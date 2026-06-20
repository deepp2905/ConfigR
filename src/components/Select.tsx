import { useEffect, useRef, useState } from 'react'
import { Chevron } from './Chevron'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel?: string
  /** 'inline' = boxed control; 'pill' = compact rounded pill. */
  variant?: 'inline' | 'pill'
}

/**
 * Themed dropdown that replaces the native <select> so the popup matches the rest of the
 * dark UI (native option lists can't be styled consistently across browsers).
 */
export function Select({ value, options, onChange, ariaLabel, variant = 'inline' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const current = options.find((o) => o.value === value)

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

  return (
    <div className={`ui-select ${variant} ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="ui-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ui-select-value">{current?.label ?? ''}</span>
        <span className="ui-select-caret" aria-hidden>
          <Chevron />
        </span>
      </button>
      {open && (
        <ul className="ui-select-menu" role="listbox">
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`ui-select-option ${o.value === value ? 'is-active' : ''}`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
