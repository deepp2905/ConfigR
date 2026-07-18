import { useEffect, useRef, useState } from 'react'
import { useConfig, useDispatchConfig } from '../state/store'
import { getDevice, DEVICE_PRESETS } from '../devices/presets'
import { getShader, getPalette, buildShaderProps } from '../shaders/registry'
import { normalizeUrl } from '../lib/url'
import { QrLayer } from './QrLayer'
import { Select } from './Select'
import { QrUrlEditor } from './QrUrlEditor'
import { DiceIcon } from './DiceIcon'

export function PhonePreview() {
  const state = useConfig()
  const dispatch = useDispatchConfig()
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [qrSelected, setQrSelected] = useState(false)
  // The link pill. Open on load (over the placeholder QR) so the first thing on screen
  // is a focused field asking for the user's link; afterwards, a click on the QR reopens it.
  const [showUrlPill, setShowUrlPill] = useState(true)
  // Faded out mid-drag/resize so it never sits under the cursor.
  const [qrBusy, setQrBusy] = useState(false)
  // The pill's field contents and edit/saved mode live here, not in the pill, so dismissing
  // and reopening it restores what was typed instead of resetting to a blank field.
  const [urlDraft, setUrlDraft] = useState('')
  const [urlEditing, setUrlEditing] = useState(true)
  const [dieFace, setDieFace] = useState(5)

  const device = getDevice(state.deviceId)
  const def = getShader(state.shaderId)
  const palette = getPalette(state.paletteId)
  const shaderProps = buildShaderProps(def, palette, state.params)

  const normalizedUrl = normalizeUrl(state.url)
  const wasValidRef = useRef(false)

  // Select the QR (show its resize outline + handles) the moment it appears, as a
  // signifier that it can be moved/resized. Re-asserts every time it (re)appears.
  useEffect(() => {
    const valid = normalizedUrl !== null
    if (valid && !wasValidRef.current) setQrSelected(true)
    if (!valid) setQrSelected(false)
    wasValidRef.current = valid
  }, [normalizedUrl])

  // A pointer-down anywhere outside the QR and its pill (the whole viewport) dismisses both.
  // This is the pill's only close path — it deliberately stays open through Save.
  useEffect(() => {
    if (!qrSelected && !showUrlPill) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest?.('.qr-box') || target?.closest?.('.qr-url-editor')) return
      setQrSelected(false)
      setShowUrlPill(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [qrSelected, showUrlPill])

  const Shader = def.Component

  return (
    <div className="preview-stage">
      <div className="device-select">
        <Select
          variant="pill"
          ariaLabel="Phone size"
          value={state.deviceId}
          onChange={(deviceId) => dispatch({ type: 'SET_DEVICE', deviceId })}
          options={DEVICE_PRESETS.map((d) => ({
            value: d.id,
            label: `${d.label}  ·  ${d.width} × ${d.height}`,
          }))}
        />
      </div>

      <div
        className="phone-stage"
        style={{ aspectRatio: `${device.width} / ${device.height}` }}
      >
        {/* Subtle ambient glow: the same gradient, static, heavily blurred and faint.
            Static on purpose — motion isn't worth the render cost when it's this blurred. */}
        <Shader
          key={`glow-${def.id}`}
          {...shaderProps}
          speed={0}
          frame={state.seed}
          aria-hidden
          className="phone-glow"
        />
        <div className="phone-frame" ref={frameRef}>
        <Shader
          key={def.id}
          {...shaderProps}
          speed={0}
          frame={state.seed}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        {normalizedUrl && (
          <QrLayer
            url={normalizedUrl}
            qr={state.qr}
            qrStyle={state.qrStyle}
            selected={qrSelected}
            aspect={device.width / device.height}
            frameRef={frameRef}
            onSelect={() => {
              setQrSelected(true)
              setShowUrlPill(true)
            }}
            onDragStateChange={setQrBusy}
            onChange={(patch) => dispatch({ type: 'SET_QR', patch })}
          />
        )}
        {normalizedUrl && showUrlPill && (
          <QrUrlEditor
            anchorX={state.qr.posX}
            anchorY={state.qr.posY - (state.qr.scale * (device.width / device.height)) / 2}
            anchorYBottom={state.qr.posY + (state.qr.scale * (device.width / device.height)) / 2}
            hidden={qrBusy}
            draft={urlDraft}
            onDraftChange={setUrlDraft}
            editing={urlEditing}
            onEditingChange={setUrlEditing}
            onChange={(url) => dispatch({ type: 'SET_URL', url })}
          />
        )}
        {state.showConfigMark && (
          <div
            className="config-mark"
            aria-hidden
            style={{
              background: state.qr.color,
              opacity: state.qr.opacity,
              mixBlendMode: state.qr.blendMode === 'overlay' ? 'overlay' : undefined,
            }}
          />
        )}
        </div>
      </div>

      <button
        className="btn-randomize"
        onClick={() => {
          setDieFace(1 + Math.floor(Math.random() * 6))
          dispatch({ type: 'RANDOMIZE_BACKGROUND' })
        }}
      >
        <DiceIcon value={dieFace} /> Randomize
      </button>
    </div>
  )
}
