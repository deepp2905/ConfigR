import { useState, type ReactNode } from 'react'
import { useConfig, useDispatchConfig } from '../state/store'
import { DEVICE_PRESETS } from '../devices/presets'
import { SHADERS, getShader } from '../shaders/registry'
import { exportWallpaper } from '../export/renderWallpaper'

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
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
      <Panel title="Phone size">
        <select
          className="select"
          value={state.deviceId}
          onChange={(e) => dispatch({ type: 'SET_DEVICE', deviceId: e.target.value })}
        >
          {DEVICE_PRESETS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} — {d.width}×{d.height}
            </option>
          ))}
        </select>
      </Panel>

      <Panel
        title="Background"
        action={
          <button
            className="mini-btn"
            onClick={() => dispatch({ type: 'RANDOMIZE_BACKGROUND' })}
          >
            <span aria-hidden>⟳</span> Randomize
          </button>
        }
      >
        <div className="chips">
          {SHADERS.map((s) => (
            <button
              key={s.id}
              className={`chip ${s.id === state.shaderId ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'SET_SHADER', shaderId: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="swatches">
          {def.palettes.map((p) => (
            <button
              key={p.id}
              className={`swatch ${p.id === palette.id ? 'is-active' : ''}`}
              title={p.label}
              aria-label={p.label}
              onClick={() => dispatch({ type: 'SET_PALETTE', paletteId: p.id })}
              style={{
                background: `linear-gradient(135deg, ${p.colors.slice(0, 3).join(', ')})`,
              }}
            />
          ))}
        </div>

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
      </Panel>

      <Panel title="QR code">
        <Slider
          label="Size"
          value={state.qr.scale}
          min={0.22}
          max={0.5}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => dispatch({ type: 'SET_QR', patch: { scale: v } })}
        />
        <Slider
          label="Horizontal"
          value={state.qr.posX}
          min={0.12}
          max={0.88}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => dispatch({ type: 'SET_QR', patch: { posX: v } })}
        />
        <Slider
          label="Vertical"
          value={state.qr.posY}
          min={0.12}
          max={0.88}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => dispatch({ type: 'SET_QR', patch: { posY: v } })}
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
              onChange={(e) => dispatch({ type: 'SET_QR', patch: { manualColor: e.target.value } })}
            />
          </label>
        ) : (
          <p className="hint">QR color adapts to the background for contrast.</p>
        )}
      </Panel>

      {error && <p className="error">{error}</p>}

      <div className="export-bar">
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Rendering…' : 'Export PNG'}
        </button>
      </div>
    </div>
  )
}
