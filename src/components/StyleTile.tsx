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
  const props = { ...buildShaderProps(def, NEUTRAL, defaultParams(def)), ...def.tile }
  return (
    <span className="style-thumb">
      <Shader
        {...props}
        speed={0}
        frame={1500}
        // With speed=0 the shader paints exactly once, and WebGL clears the drawing
        // buffer after each paint unless it's preserved — so without this the tile
        // composites as an empty (black) canvas. Same reason the preview sets it.
        webGlContextAttributes={{ preserveDrawingBuffer: true }}
        // Lands on the shader's wrapper div, which is the element the library mounts
        // its canvas into; it must fill .style-thumb for the canvas's own inset:0
        // sizing to produce a visible square.
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </span>
  )
}
