import { useEffect, useMemo, useRef } from 'react'
import { useConfig, useDispatchConfig } from '../state/store'
import { getDevice } from '../devices/presets'
import { getShader, buildShaderProps } from '../shaders/registry'
import { resolveQrColor, sampleRegionLuminance } from '../lib/qrColor'
import { QrLayer } from './QrLayer'

export function PhonePreview() {
  const state = useConfig()
  const dispatch = useDispatchConfig()
  const frameRef = useRef<HTMLDivElement | null>(null)

  const device = getDevice(state.deviceId)
  const def = getShader(state.shaderId)
  const palette = def.palettes.find((p) => p.id === state.paletteId) ?? def.palettes[0]
  const shaderProps = buildShaderProps(def, palette, state.params)

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
        const qrH = state.qr.scale * aspect // QR height as fraction of wallpaper height
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
        <QrLayer url={state.url} qr={state.qr} color={qrColor} />
      </div>

      <div className="preview-url">
        <input
          className="text-input"
          type="url"
          inputMode="url"
          placeholder="https://your-link.com"
          value={state.url}
          onChange={(e) => dispatch({ type: 'SET_URL', url: e.target.value })}
        />
        <p className="preview-meta">
          {state.url ? `${device.label} · ${device.width}×${device.height}` : 'Add a URL to make the QR scannable.'}
        </p>
      </div>
    </div>
  )
}
