import { useState } from 'react'
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
        onPointerDown={() => {
          document.documentElement.classList.add('qr-cur-grabbing')
          const up = () => {
            document.documentElement.classList.remove('qr-cur-grabbing')
            window.removeEventListener('pointerup', up)
          }
          window.addEventListener('pointerup', up)
        }}
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
  // The QR dropdown is only usable once there's a valid link to encode.
  const urlValid = isValidUrl(state.url)

  // Accordion: only one collapsible section (Fine-tune / QR) is open at a time.
  const [openSection, setOpenSection] = useState<'finetune' | 'qr' | null>(null)
  const fineTune = openSection === 'finetune'
  // Force the QR section shut whenever the link isn't valid.
  const qrOpen = openSection === 'qr' && urlValid
  const toggleSection = (s: 'finetune' | 'qr') => {
    if (s === 'qr' && !urlValid) return
    setOpenSection((cur) => (cur === s ? null : s))
  }

  // The 3 most important fine-tune sliders: the top per-shader param, plus Scale and Seed.
  const scaleParam = def.params.find((p) => p.key === 'scale')
  const topParam = def.params.find((p) => p.key !== 'scale')

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
    <>
    <div className="controls">
      {/* Scrollable content; the Download bar stays pinned at the bottom. */}
      <div className="controls-scroll">
      {/* The link is edited in place on the preview (QrUrlEditor), not here. */}

      {/* QR — collapsible dropdown (disabled until a valid link exists), kept right
          below the link since it's the most directly link-related control. */}
      <div className="section is-collapsible">
        {urlValid ? (
          <button
            className="dropdown-head"
            aria-expanded={qrOpen}
            onClick={() => toggleSection('qr')}
          >
            <span className="section-label">QR code</span>
            <span className={`chevron ${qrOpen ? 'is-open' : ''}`} aria-hidden>
              <Chevron />
            </span>
          </button>
        ) : (
          // No valid URL: the label isn't a toggle, and the link is fixed on the preview
          // itself, so this is a hint rather than a control.
          <div className="dropdown-head is-disabled" aria-disabled>
            <span className="section-label">QR code</span>
            <span className="chip">Add a valid URL</span>
          </div>
        )}
        <div className={`dropdown-body ${qrOpen ? 'is-open' : ''}`}>
          <div className="dropdown-inner qr-fields">
          <div className="qr-field">
            <span className="qr-field-label">Color</span>
            <div className="swatches">
              {QR_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch qr-dot ${state.qr.color === c.value ? 'is-active' : ''}`}
                  data-label={c.label}
                  aria-label={c.label}
                  onClick={() => dispatch({ type: 'SET_QR', patch: { color: c.value } })}
                  style={{ background: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="qr-field">
            <span className="qr-field-label">Style</span>
            <div className="segmented" role="tablist" aria-label="QR style">
              {QR_STYLES.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={state.qrStyle === s.id}
                  className={state.qrStyle === s.id ? 'is-active' : ''}
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
      </div>

      {/* ② Style — pick a vibe fast */}
      <div className="section">
        <div className="section-head">
          <span className="section-label">Background style</span>
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
          <span className="section-label">Background color</span>
        </div>
        <div className="swatches">
          {ALL_PALETTES.map((p) => (
            <button
              key={p.id}
              className={`swatch ${p.id === state.paletteId ? 'is-active' : ''}`}
              data-label={p.label}
              aria-label={p.label}
              onClick={() => dispatch({ type: 'SET_PALETTE', paletteId: p.id })}
              style={{ background: `linear-gradient(135deg, ${p.colors.slice(0, 3).join(', ')})` }}
            />
          ))}
        </div>
      </div>

      {/* Fine-tune — collapsible dropdown of the 3 key sliders */}
      <div className="section is-collapsible keep-divider">
        <button
          className="dropdown-head"
          aria-expanded={fineTune}
          onClick={() => toggleSection('finetune')}
        >
          <span className="section-label">Fine-tune background</span>
          <span className={`chevron ${fineTune ? 'is-open' : ''}`} aria-hidden>
            <Chevron />
          </span>
        </button>
        <div className={`dropdown-body ${fineTune ? 'is-open' : ''}`}>
          <div className="dropdown-inner">
            {topParam && (
              <Slider
                label={topParam.label}
                value={state.params[topParam.key] ?? topParam.default}
                min={topParam.min}
                max={topParam.max}
                step={topParam.step}
                onChange={(v) => dispatch({ type: 'SET_PARAM', key: topParam.key, value: v })}
              />
            )}
            {scaleParam && (
              <Slider
                label={scaleParam.label}
                value={state.params[scaleParam.key] ?? scaleParam.default}
                min={scaleParam.min}
                max={scaleParam.max}
                step={scaleParam.step}
                onChange={(v) => dispatch({ type: 'SET_PARAM', key: scaleParam.key, value: v })}
              />
            )}
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
        </div>
      </div>

      {/* Show / hide the Config wordmark watermark */}
      <div className="section switch-row">
        <span>Show Config logo</span>
        <button
          role="switch"
          aria-checked={state.showConfigMark}
          aria-label="Show Config logo on the wallpaper"
          className={`switch ${state.showConfigMark ? 'on' : ''}`}
          onClick={() => dispatch({ type: 'SET_SHOW_CONFIG_MARK', value: !state.showConfigMark })}
        >
          <span className="knob" />
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      </div>

      <div className="export-bar">
        <button className="btn-export" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Rendering…' : 'Download'}
        </button>
        <p className="credit">
          Created by{' '}
          <a href="https://x.com/deepp2905" target="_blank" rel="noopener noreferrer">
            Deep Patel
          </a>
        </p>
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
    </>
  )
}
