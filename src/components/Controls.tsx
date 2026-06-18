import { useState } from 'react'
import { useConfig, useDispatchConfig } from '../state/store'
import { SHADERS, getShader } from '../shaders/registry'
import { exportWallpaper } from '../export/renderWallpaper'

/** Representative gradient for each style's visual picker tile (uses its first palette). */
const STYLE_THUMB: Record<string, (c: string[]) => string> = {
  'mesh-gradient': (c) => `radial-gradient(circle at 32% 28%, ${c[0]}, ${c[1]} 45%, ${c[2]})`,
  warp: (c) => `linear-gradient(135deg, ${c[0]}, ${c[1]}, ${c[2]})`,
  'grain-gradient': (c) => `linear-gradient(180deg, ${c[0]}, ${c[1]}, ${c[2]})`,
  swirl: (c) => `conic-gradient(from 210deg, ${c[0]}, ${c[1]}, ${c[2]}, ${c[0]})`,
}

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
  const palette = def.palettes.find((p) => p.id === state.paletteId) ?? def.palettes[0]

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
          {SHADERS.map((s) => {
            const colors = s.palettes[0].colors
            const thumb = (STYLE_THUMB[s.id] ?? STYLE_THUMB.warp)(colors)
            return (
              <button
                key={s.id}
                className={`style-tile ${s.id === state.shaderId ? 'is-active' : ''}`}
                onClick={() => dispatch({ type: 'SET_SHADER', shaderId: s.id })}
              >
                <span className="style-thumb" style={{ background: thumb }} />
                <span className="style-name">{s.label}</span>
              </button>
            )
          })}
        </div>

        <div className="swatches">
          {def.palettes.map((p) => (
            <button
              key={p.id}
              className={`swatch ${p.id === palette.id ? 'is-active' : ''}`}
              title={p.label}
              aria-label={p.label}
              onClick={() => dispatch({ type: 'SET_PALETTE', paletteId: p.id })}
              style={{ background: `linear-gradient(135deg, ${p.colors.slice(0, 3).join(', ')})` }}
            />
          ))}
        </div>
      </div>

      {/* ③ QR */}
      <div className="section">
        <div className="section-head">
          <span className="section-label">QR code</span>
        </div>
        <div className="field-stack">
          <Slider
            label="Size"
            value={state.qr.scale}
            min={0.22}
            max={0.5}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => dispatch({ type: 'SET_QR', patch: { scale: v } })}
          />

          <label className="toggle">
            <input
              type="checkbox"
              checked={state.qr.rounded}
              onChange={(e) => dispatch({ type: 'SET_QR', patch: { rounded: e.target.checked } })}
            />
            <span>Rounded modules</span>
          </label>

          <div className="segmented">
            <button
              className={state.qr.colorMode === 'auto' ? 'is-active' : ''}
              onClick={() => dispatch({ type: 'SET_QR', patch: { colorMode: 'auto' } })}
            >
              Auto color
            </button>
            <button
              className={state.qr.colorMode === 'manual' ? 'is-active' : ''}
              onClick={() => dispatch({ type: 'SET_QR', patch: { colorMode: 'manual' } })}
            >
              Manual
            </button>
          </div>

          {state.qr.colorMode === 'manual' ? (
            <label className="color-row">
              <span>QR color</span>
              <input
                type="color"
                value={state.qr.manualColor}
                onChange={(e) =>
                  dispatch({ type: 'SET_QR', patch: { manualColor: e.target.value } })
                }
              />
            </label>
          ) : (
            <p className="hint">QR color adapts to the background for contrast.</p>
          )}
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

      {error && <p className="error">{error}</p>}

      <div className="export-bar">
        <button className="btn-export" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Rendering…' : 'Export PNG'}
        </button>
      </div>
    </div>
  )
}
