import { useConfig } from '../state/store'
import { getShader, getPalette, buildShaderProps } from '../shaders/registry'

/**
 * A static, blurred render of the currently-active shader/palette, used as an ambient glow
 * behind UI (the phone mockup, the "Your link" field). Static on purpose — the heavy blur
 * makes motion imperceptible and not worth the render cost. Styling (size/opacity/blur) is
 * supplied by the consumer's className.
 */
export function ShaderGlow({ className }: { className: string }) {
  const state = useConfig()
  const def = getShader(state.shaderId)
  const palette = getPalette(state.paletteId)
  const shaderProps = buildShaderProps(def, palette, state.params)
  const Shader = def.Component

  return (
    <Shader
      key={`glow-${def.id}`}
      {...shaderProps}
      speed={0}
      frame={state.seed}
      aria-hidden
      className={className}
    />
  )
}
