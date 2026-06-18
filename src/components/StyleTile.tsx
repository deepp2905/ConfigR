import { buildShaderProps, defaultParams, type ShaderDef } from '../shaders/registry'

/**
 * Consistent neutral palette for every style tile, so the picker communicates the shader's
 * *form/motion* rather than color. Color is chosen separately in the Color section.
 */
const NEUTRAL = {
  id: 'neutral',
  label: 'Neutral',
  colors: ['#f4f4f6', '#9a9aa4', '#1a1a1f'],
  colorBack: '#0a0a0c',
}

/** A live, static mini-render of the actual shader in grayscale. */
export function StyleTile({ def }: { def: ShaderDef }) {
  const Shader = def.Component
  const props = buildShaderProps(def, NEUTRAL, defaultParams(def))
  return (
    <span className="style-thumb">
      <Shader
        {...props}
        speed={0}
        frame={1500}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </span>
  )
}
