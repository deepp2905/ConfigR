import type { FC } from 'react'
import { MeshGradient, Warp, GrainGradient, Swirl } from '@paper-design/shaders-react'

/**
 * The shader registry is the single source of truth for the "variety pack" and,
 * crucially, for *how much* an attendee can tweak a look. The UI never exposes raw
 * shader uniforms — only a palette choice plus the bounded params declared here.
 * Randomize samples strictly within these bounds, so every result stays tasteful.
 */

export interface Palette {
  id: string
  label: string
  /** Colors fed to the shader's `colors` uniform. */
  colors: string[]
  /** Optional background color for shaders that take `colorBack`. */
  colorBack?: string
}

export interface BoundedParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

export interface ShaderDef {
  id: string
  label: string
  Component: FC<Record<string, unknown>>
  /** Static props always passed to the shader. */
  base: Record<string, unknown>
  /** Curated palettes the user can pick between. */
  palettes: Palette[]
  /** Tweakable, bounded numeric params surfaced as sliders. */
  params: BoundedParam[]
  /** Whether the shader accepts a `colorBack` uniform (others would leak it to the DOM). */
  acceptsColorBack?: boolean
}

const PALETTES = {
  configPop: { id: 'config-pop', label: 'Config Pop', colors: ['#7c5cff', '#ff5c8a', '#ffd166', '#22d3ee'] },
  sunset: { id: 'sunset', label: 'Sunset', colors: ['#ff7849', '#ff2e63', '#7b2ff7', '#08001f'], colorBack: '#08001f' },
  aurora: { id: 'aurora', label: 'Aurora', colors: ['#00ffa3', '#03e1ff', '#6f00ff', '#03001a'], colorBack: '#03001a' },
  ember: { id: 'ember', label: 'Ember', colors: ['#ffb703', '#fb8500', '#e63946', '#1a0a00'], colorBack: '#1a0a00' },
  ocean: { id: 'ocean', label: 'Ocean', colors: ['#48cae4', '#0096c7', '#023e8a', '#03045e'], colorBack: '#03045e' },
  mono: { id: 'mono', label: 'Graphite', colors: ['#e9e9ee', '#9aa0b5', '#3a3d52', '#0a0a0b'], colorBack: '#0a0a0b' },
  candy: { id: 'candy', label: 'Candy', colors: ['#ff5c8a', '#ff8fab', '#ffc2d1', '#22d3ee'] },
} satisfies Record<string, Palette>

export const SHADERS: ShaderDef[] = [
  {
    id: 'mesh-gradient',
    label: 'Mesh',
    Component: MeshGradient as unknown as FC<Record<string, unknown>>,
    base: {},
    palettes: [PALETTES.configPop, PALETTES.sunset, PALETTES.aurora, PALETTES.candy, PALETTES.mono],
    params: [
      { key: 'distortion', label: 'Distortion', min: 0.3, max: 1, step: 0.05, default: 0.8 },
      { key: 'swirl', label: 'Swirl', min: 0, max: 0.8, step: 0.05, default: 0.25 },
      { key: 'scale', label: 'Scale', min: 0.7, max: 1.4, step: 0.05, default: 1 },
      { key: 'rotation', label: 'Rotation', min: 0, max: 360, step: 15, default: 0 },
    ],
  },
  {
    id: 'warp',
    label: 'Warp',
    Component: Warp as unknown as FC<Record<string, unknown>>,
    base: { shape: 'checks' },
    palettes: [PALETTES.aurora, PALETTES.sunset, PALETTES.ocean, PALETTES.configPop],
    params: [
      { key: 'distortion', label: 'Distortion', min: 0.1, max: 0.5, step: 0.02, default: 0.25 },
      { key: 'swirl', label: 'Swirl', min: 0.2, max: 1, step: 0.05, default: 0.6 },
      { key: 'proportion', label: 'Proportion', min: 0.2, max: 0.8, step: 0.05, default: 0.5 },
      { key: 'softness', label: 'Softness', min: 0.4, max: 1.5, step: 0.05, default: 1 },
      { key: 'scale', label: 'Scale', min: 0.6, max: 1.4, step: 0.05, default: 1 },
      { key: 'rotation', label: 'Rotation', min: 0, max: 360, step: 15, default: 0 },
    ],
  },
  {
    id: 'grain-gradient',
    label: 'Grain',
    Component: GrainGradient as unknown as FC<Record<string, unknown>>,
    base: { shape: 'wave' },
    palettes: [PALETTES.sunset, PALETTES.ember, PALETTES.aurora, PALETTES.mono],
    params: [
      { key: 'softness', label: 'Softness', min: 0.3, max: 0.9, step: 0.05, default: 0.6 },
      { key: 'intensity', label: 'Intensity', min: 0.3, max: 0.8, step: 0.05, default: 0.5 },
      { key: 'noise', label: 'Grain', min: 0.1, max: 0.7, step: 0.05, default: 0.35 },
      { key: 'scale', label: 'Scale', min: 0.7, max: 1.4, step: 0.05, default: 1 },
    ],
    acceptsColorBack: true,
  },
  {
    id: 'swirl',
    label: 'Spiral',
    Component: Swirl as unknown as FC<Record<string, unknown>>,
    base: {},
    palettes: [PALETTES.configPop, PALETTES.candy, PALETTES.sunset, PALETTES.mono],
    params: [
      { key: 'bandCount', label: 'Bands', min: 3, max: 9, step: 1, default: 5 },
      { key: 'twist', label: 'Twist', min: 0.1, max: 0.6, step: 0.05, default: 0.3 },
      { key: 'softness', label: 'Softness', min: 0.2, max: 0.9, step: 0.05, default: 0.5 },
      { key: 'noiseFrequency', label: 'Noise freq', min: 0.2, max: 0.8, step: 0.05, default: 0.5 },
      { key: 'noise', label: 'Noise', min: 0, max: 0.5, step: 0.05, default: 0.2 },
    ],
    acceptsColorBack: true,
  },
]

export const DEFAULT_SHADER_ID = 'mesh-gradient'

export function getShader(id: string): ShaderDef {
  return SHADERS.find((s) => s.id === id) ?? SHADERS[0]
}

/** Default param values for a shader, keyed by param key. */
export function defaultParams(def: ShaderDef): Record<string, number> {
  return Object.fromEntries(def.params.map((p) => [p.key, p.default]))
}

/**
 * Build the full prop set passed to a shader component, combining static base props,
 * the active palette, and the current bounded params.
 */
export function buildShaderProps(
  def: ShaderDef,
  palette: Palette,
  params: Record<string, number>,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    ...def.base,
    colors: palette.colors,
    ...params,
  }
  if (def.acceptsColorBack && palette.colorBack) props.colorBack = palette.colorBack
  return props
}
