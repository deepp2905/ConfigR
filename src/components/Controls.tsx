import { useRef, useState } from 'react'
import { useConfig, useDispatchConfig, QR_WHITE, QR_BLACK, QR_STYLES } from '../state/store'
import { SHADERS, getShader, ALL_PALETTES } from '../shaders/registry'
import { exportWallpaper } from '../export/renderWallpaper'
import { StyleTile } from './StyleTile'
import { NoQrModal } from './NoQrModal'
import { Chevron } from './Chevron'
import { isValidUrl } from '../lib/url'

const QR_COLORS: { id: string; label: string; value: string }[] = [
  { id: 'white', label: 'White', value: QR_WHITE },
  { id: 'black', label: 'Black', value: QR_BLACK },
]

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{label}</span>
        <span className="slider-value">{format ? format(value) : Number(value.toFixed(2))}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Controls() {
  const state = useConfig()
  const dispatch = useDispatchConfig()
  const def = getShader(state.shaderId)

  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNoQr, setShowNoQr] = useState(false)
  const customColorRef = useRef<HTMLInputElement | null>(null)
  const isCustomColor = state.qr.color !== QR_WHITE && state.qr.color !== QR_BLACK

  async function runExport() {
    setError(null)
    setExporting(true)
    try {
      await exportWallpaper(state)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  function handleExport() {
    // No valid link → no QR will be in the wallpaper. Confirm before exporting.
    if (!isValidUrl(state.url)) {
      setShowNoQr(true)
      return
    }
    void runExport()
  }

  return (
    <div className="controls">
      {/* ① Your link — the whole point */}
      <div className="hero">
        <label className="hero-label" htmlFor="link-input">
          Your link
        </label>
        <input
          id="link-input"
          className="hero-input"
          type="url"
          inputMode="url"
          placeholder="https://your-link.com"
          value={state.url}
          onChange={(e) => dispatch({ type: 'SET_URL', url: e.target.value })}
        />
        {!state.url && <p className="hero-hint">Add a URL to make the QR scannable.</p>}
      </div>

      {/* ② Style — pick a vibe fast */}
      <div className="section">
        <div className="section-head">
          <span className="section-label">Style</span>
        </div>

        <div className="style-grid">
          {SHADERS.map((s) => (
            <button
              key={s.id}
              className={`style-tile ${s.id === state.shaderId ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'SET_SHADER', shaderId: s.id })}
            >
              <StyleTile def={s} />
              <span className="style-name">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color — shader palette */}
      <div className="section">
        <div className="section-head">
          <span className="section-label">Color</span>
        </div>
        <div className="swatches">
          {ALL_PALETTES.map((p) => (
            <button
              key={p.id}
              className={`swatch ${p.id === state.paletteId ? 'is-active' : ''}`}
              title={p.label}
              aria-label={p.label}
              onClick={() => dispatch({ type: 'SET_PALETTE', paletteId: p.id })}
              style={{ background: `linear-gradient(135deg, ${p.colors.slice(0, 3).join(', ')})` }}
            />
          ))}
        </div>
      </div>

      {/* Fine-tune — power-user tweaking, de-emphasized */}
      <details className="finetune">
        <summary>
          <span>Fine-tune</span>
          <span className="chevron" aria-hidden>
            <Chevron />
          </span>
        </summary>
        <div className="finetune-body">
          {def.params.map((p) => (
            <Slider
              key={p.key}
              label={p.label}
              value={state.params[p.key] ?? p.default}
              min={p.min}
              max={p.max}
              step={p.step}
              onChange={(v) => dispatch({ type: 'SET_PARAM', key: p.key, value: v })}
            />
          ))}
          <Slider
            label="Seed"
            value={state.seed}
            min={0}
            max={9999}
            step={1}
            format={(v) => String(Math.round(v))}
            onChange={(v) => dispatch({ type: 'SET_SEED', value: v })}
          />
        </div>
      </details>

      {/* QR */}
      <div className="section">
        <div className="section-head">
          <span className="section-label">QR code</span>
        </div>
        <div className="qr-fields">
          <div className="qr-field">
            <span className="qr-field-label">Color</span>
            <div className="swatches">
              {QR_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch qr-dot ${state.qr.color === c.value ? 'is-active' : ''}`}
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => dispatch({ type: 'SET_QR', patch: { color: c.value } })}
                  style={{ background: c.value }}
                />
              ))}
              <button
                className={`swatch qr-dot qr-dot-custom ${isCustomColor ? 'is-active' : ''}`}
                title="Custom color"
                aria-label="Custom color"
                onClick={() => customColorRef.current?.click()}
                style={isCustomColor ? { background: state.qr.color } : undefined}
              >
                {!isCustomColor && <span className="plus" aria-hidden>+</span>}
                <input
                  ref={customColorRef}
                  type="color"
                  className="qr-color-input"
                  value={state.qr.color}
                  onChange={(e) => dispatch({ type: 'SET_QR', patch: { color: e.target.value } })}
                />
              </button>
            </div>
          </div>

          <div className="qr-field">
            <span className="qr-field-label">Style</span>
            <div className="qr-style-row" role="tablist" aria-label="QR style">
              {QR_STYLES.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={state.qrStyle === s.id}
                  className={`qr-style-btn ${state.qrStyle === s.id ? 'is-active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_QR_STYLE', value: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="qr-adjust">
            <Slider
              label="Opacity"
              value={state.qr.opacity}
              min={0.1}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => dispatch({ type: 'SET_QR', patch: { opacity: v } })}
            />

            <div className="switch-row">
              <span>Blend</span>
              <button
                role="switch"
                aria-checked={state.qr.blendMode === 'overlay'}
                aria-label="Blend QR with background"
                className={`switch ${state.qr.blendMode === 'overlay' ? 'on' : ''}`}
                onClick={() =>
                  dispatch({
                    type: 'SET_QR',
                    patch: { blendMode: state.qr.blendMode === 'overlay' ? 'normal' : 'overlay' },
                  })
                }
              >
                <span className="knob" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="export-bar">
        <button className="btn-export" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Rendering…' : 'Download'}
        </button>
      </div>

      {showNoQr && (
        <NoQrModal
          onProceed={() => {
            setShowNoQr(false)
            void runExport()
          }}
          onBack={() => setShowNoQr(false)}
        />
      )}
    </div>
  )
}
