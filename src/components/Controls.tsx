import { useState } from 'react'
import { useConfig, useDispatchConfig, QR_WHITE, QR_BLACK } from '../state/store'
import { SHADERS, getShader, ALL_PALETTES } from '../shaders/registry'
import { exportWallpaper } from '../export/renderWallpaper'
import { StyleTile } from './StyleTile'
import { Select } from './Select'

const QR_COLORS: { id: string; label: string; value: string }[] = [
  { id: 'white', label: 'White', value: QR_WHITE },
  { id: 'black', label: 'Black', value: QR_BLACK },
]

const QR_BLEND: { value: string; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'luminosity', label: 'Luminosity' },
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

  async function handleExport() {
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
        <p className="hero-hint">
          {state.url ? 'This is where your QR code points.' : 'Add a URL to make the QR scannable.'}
        </p>
      </div>

      {/* ② Style — pick a vibe fast */}
      <div className="section">
        <div className="section-head">
          <span className="section-label">Style</span>
          <button
            className="mini-btn"
            onClick={() => dispatch({ type: 'RANDOMIZE_BACKGROUND' })}
          >
            <span aria-hidden>⟳</span> Randomize
          </button>
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
          <span className="chevron" aria-hidden>
            ▶
          </span>
          Fine-tune
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
        <div className="field-stack">
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
          </div>

          <Slider
            label="Opacity"
            value={state.qr.opacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => dispatch({ type: 'SET_QR', patch: { opacity: v } })}
          />

          <div className="select-row">
            <span>Blend</span>
            <Select
              ariaLabel="QR blend mode"
              value={state.qr.blendMode}
              options={QR_BLEND}
              onChange={(blendMode) => dispatch({ type: 'SET_QR', patch: { blendMode } })}
            />
          </div>

          <div className="switch-row">
            <span>Rounded corners</span>
            <button
              role="switch"
              aria-checked={state.qr.rounded}
              aria-label="Rounded corners"
              className={`switch ${state.qr.rounded ? 'on' : ''}`}
              onClick={() => dispatch({ type: 'SET_QR', patch: { rounded: !state.qr.rounded } })}
            >
              <span className="knob" />
            </button>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="export-bar">
        <button className="btn-export" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Rendering…' : 'Export PNG'}
        </button>
      </div>
    </div>
  )
}
