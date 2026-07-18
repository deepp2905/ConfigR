import { useEffect, useRef, useState } from 'react'
import { GlobeIcon } from './GlobeIcon'
import { isValidUrl } from '../lib/url'
import { DEFAULT_URL } from '../state/store'

interface QrUrlEditorProps {
  /** Horizontal center of the QR, 0–1 of the frame width — the pill centers on this. */
  anchorX: number
  /** Top edge of the QR, 0–1 of the frame height — the pill sits above it. */
  anchorY: number
  /** Bottom edge of the QR — the pill flips down to here when there's no room above. */
  anchorYBottom: number
  /** Dim + disable pointer events while the QR is being dragged or resized. */
  hidden: boolean
  /** Live preview: fires on every keystroke that parses as a URL. */
  onChange: (url: string) => void
}

/**
 * In-place link editor pinned to the QR. Two states:
 *   editing  — text field + Save. Typing live-previews into the QR.
 *   saved    — the committed link, read-only, + Edit to go back.
 * It never self-closes; PhonePreview unmounts it on an outside click.
 */
export function QrUrlEditor({
  anchorX,
  anchorY,
  anchorYBottom,
  hidden,
  onChange,
}: QrUrlEditorProps) {
  // Flip below the QR when it's too close to the top of the frame for the pill to fit.
  const below = anchorY < 0.09
  const inputRef = useRef<HTMLInputElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  // Horizontal nudge (px) that keeps the pill inside the phone frame when the QR sits near
  // an edge — without it the pill is centered on the QR and its ends clip off the screen.
  const [shiftX, setShiftX] = useState(0)
  // Starts empty over the placeholder QR so typing needs no clearing step.
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(true)
  // Set on a failed save; drives the shake + message, cleared as soon as typing resumes.
  const [rejected, setRejected] = useState(false)

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
  }, [editing])

  // Re-measure whenever the anchor or the pill's own width changes (Save/Edit swap resizes it).
  useEffect(() => {
    const el = rootRef.current
    const frame = el?.offsetParent as HTMLElement | null
    if (!el || !frame) return
    const GUTTER = 10
    // Undo the current shift to measure the pill's natural (centered) position.
    const half = el.offsetWidth / 2
    const centerX = anchorX * frame.clientWidth
    const overLeft = GUTTER - (centerX - half)
    const overRight = centerX + half - (frame.clientWidth - GUTTER)
    const next = overLeft > 0 ? overLeft : overRight > 0 ? -overRight : 0
    setShiftX(next)
  }, [anchorX, editing, draft])

  function save() {
    if (!isValidUrl(draft)) {
      // Restart the shake even on a repeated failed save.
      setRejected(false)
      requestAnimationFrame(() => setRejected(true))
      inputRef.current?.focus()
      return
    }
    setRejected(false)
    setEditing(false)
  }

  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        save()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className={`qr-url-editor ${below ? 'is-below' : ''} ${hidden ? 'is-hidden' : ''} ${
        rejected ? 'is-rejected' : ''
      }`}
      ref={rootRef}
      style={{
        // Edge nudge rides on `left` so it composes with the transform-based centering
        // (and doesn't fight the shake keyframes, which own `transform`).
        left: `calc(${anchorX * 100}% + ${shiftX}px)`,
        top: `${(below ? anchorYBottom : anchorY) * 100}%`,
      }}
      // Keep clicks inside from reaching the frame's deselect handler / starting a QR drag.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="qr-url-row">
        <span className="qr-url-icon" aria-hidden>
          <GlobeIcon />
        </span>

        {editing ? (
          <input
            ref={inputRef}
            className="qr-url-input"
            type="text"
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            aria-label="QR code link"
            placeholder={DEFAULT_URL}
            value={draft}
            onChange={(e) => {
              const next = e.target.value
              setDraft(next)
              setRejected(false)
              // Live preview; an unparseable draft leaves the QR on its last good value.
              if (isValidUrl(next)) onChange(next)
            }}
          />
        ) : (
          <span className="qr-url-value">{draft}</span>
        )}

        <button
          type="button"
          className="qr-url-action"
          onClick={() => (editing ? save() : setEditing(true))}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      {rejected && (
        <div className="qr-url-error" role="alert">
          Invalid URL
        </div>
      )}
    </div>
  )
}
