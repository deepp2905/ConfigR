import { useEffect, useRef, useState } from 'react'
import { useConfig, useDispatchConfig } from '../state/store'
import { getDevice, DEVICE_PRESETS } from '../devices/presets'
import { getShader, getPalette, buildShaderProps } from '../shaders/registry'
import { normalizeUrl } from '../lib/url'
import { QrLayer } from './QrLayer'
import { Select } from './Select'

export function PhonePreview() {
  const state = useConfig()
  const dispatch = useDispatchConfig()
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [qrSelected, setQrSelected] = useState(false)

  const device = getDevice(state.deviceId)
  const def = getShader(state.shaderId)
  const palette = getPalette(state.paletteId)
  const shaderProps = buildShaderProps(def, palette, state.params)

  const normalizedUrl = normalizeUrl(state.url)
  const wasValidRef = useRef(false)

  // Select the QR (show its outline + handles) the moment it's first created.
  useEffect(() => {
    const valid = normalizedUrl !== null
    if (valid && !wasValidRef.current) setQrSelected(true)
    wasValidRef.current = valid
  }, [normalizedUrl])

  // While selected, a pointer-down anywhere outside the QR (the whole viewport) deselects it.
  useEffect(() => {
    if (!qrSelected) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest?.('.qr-box')) setQrSelected(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [qrSelected])

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
            label: `${d.label} · ${d.width}×${d.height}`,
          }))}
        />
      </div>

      <div
        className="phone-frame"
        ref={frameRef}
        style={{ aspectRatio: `${device.width} / ${device.height}` }}
      >
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
            onSelect={() => setQrSelected(true)}
            onChange={(patch) => dispatch({ type: 'SET_QR', patch })}
          />
        )}
        <div
          className="config-mark"
          aria-hidden
          style={{
            background: state.qr.color,
            mixBlendMode: state.qr.blendMode === 'overlay' ? 'overlay' : undefined,
          }}
        />
      </div>

      <button
        className="btn-randomize"
        onClick={() => dispatch({ type: 'RANDOMIZE_BACKGROUND' })}
      >
        <span aria-hidden>⟳</span> Randomize
      </button>
    </div>
  )
}
