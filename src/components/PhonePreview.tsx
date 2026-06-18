import { useEffect, useMemo, useRef, useState } from 'react'
import { useConfig, useDispatchConfig } from '../state/store'
import { getDevice, DEVICE_PRESETS } from '../devices/presets'
import { getShader, buildShaderProps } from '../shaders/registry'
import { resolveQrColor, sampleRegionLuminance } from '../lib/qrColor'
import { normalizeUrl } from '../lib/url'
import { QrLayer } from './QrLayer'

export function PhonePreview() {
  const state = useConfig()
  const dispatch = useDispatchConfig()
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [qrSelected, setQrSelected] = useState(false)

  const device = getDevice(state.deviceId)
  const def = getShader(state.shaderId)
  const palette = def.palettes.find((p) => p.id === state.paletteId) ?? def.palettes[0]
  const shaderProps = buildShaderProps(def, palette, state.params)

  const normalizedUrl = normalizeUrl(state.url)
  const paramsKey = JSON.stringify(state.params)

  // Sample the shader luminance behind the QR for adaptive coloring. The shader is static,
  // so wait two frames for it to repaint with the new uniforms before reading pixels.
  useEffect(() => {
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const canvas = frameRef.current?.querySelector('canvas') as HTMLCanvasElement | null
        if (!canvas) return
        const aspect = device.width / device.height
        const qrH = state.qr.scale * aspect
        const lum = sampleRegionLuminance(canvas, {
          x: state.qr.posX - state.qr.scale / 2,
          y: state.qr.posY - qrH / 2,
          w: state.qr.scale,
          h: qrH,
        })
        dispatch({ type: 'SET_BG_LUMINANCE', value: lum })
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [
    state.shaderId,
    state.paletteId,
    paramsKey,
    state.seed,
    state.qr.scale,
    state.qr.posX,
    state.qr.posY,
    device.width,
    device.height,
    dispatch,
  ])

  const qrColor = useMemo(
    () =>
      resolveQrColor({
        mode: state.qr.colorMode,
        manualColor: state.qr.manualColor,
        backgroundLuminance: state.backgroundLuminance,
      }),
    [state.qr.colorMode, state.qr.manualColor, state.backgroundLuminance],
  )

  const Shader = def.Component

  return (
    <div className="preview-stage">
      <div className="device-select">
        <select
          aria-label="Phone size"
          value={state.deviceId}
          onChange={(e) => dispatch({ type: 'SET_DEVICE', deviceId: e.target.value })}
        >
          {DEVICE_PRESETS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} · {d.width}×{d.height}
            </option>
          ))}
        </select>
      </div>

      <div
        className="phone-frame"
        ref={frameRef}
        style={{ aspectRatio: `${device.width} / ${device.height}` }}
        onPointerDown={() => setQrSelected(false)}
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
            color={qrColor}
            selected={qrSelected}
            frameRef={frameRef}
            onSelect={() => setQrSelected(true)}
            onChange={(patch) => dispatch({ type: 'SET_QR', patch })}
          />
        )}
      </div>
    </div>
  )
}
