import type { FC } from 'react'
import { MeshGradient, Warp, GrainGradient } from '@paper-design/shaders-react'

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
  /** Tweakable, bounded numeric params surfaced as sliders. */
  params: BoundedParam[]
  /** Whether the shader accepts a `colorBack` uniform (others would leak it to the DOM). */
  acceptsColorBack?: boolean
  /** Optional prop overrides used only for the picker thumbnail, so it reads well small. */
  tile?: Record<string, unknown>
}

const PALETTES = {
  configPop: { id: 'config-pop', label: 'Config Pop', colors: ['#7c5cff', '#ff5c8a', '#ffd166', '#22d3ee'] },
  sunset: { id: 'sunset', label: 'Sunset', colors: ['#ff7849', '#ff2e63', '#7b2ff7', '#08001f'], colorBack: '#08001f' },
  aurora: { id: 'aurora', label: 'Aurora', colors: ['#00ffa3', '#03e1ff', '#6f00ff', '#03001a'], colorBack: '#03001a' },
  ember: { id: 'ember', label: 'Ember', colors: ['#ffb703', '#fb8500', '#e63946', '#1a0a00'], colorBack: '#1a0a00' },
  mono: { id: 'mono', label: 'Graphite', colors: ['#e9e9ee', '#9aa0b5', '#3a3d52', '#0a0a0b'], colorBack: '#0a0a0b' },
  // Pop palettes from orange/yellow/green/blue + grey/black, built on color-theory harmonies.
  // Harmonious analogous pairs span hues across the set (mixing complementaries in a
  // gradient just muds to brown), plus neutral-pop options.
  // Citrus: analogous (yellow → yellow-green → green).
  citrus: { id: 'citrus', label: 'Citrus', colors: ['#f5f24a', '#7ce04a', '#2bd476'], colorBack: '#04261a' },
  // Sunburst: warm analogous (orange → amber → yellow).
  sunburst: { id: 'sunburst', label: 'Sunburst', colors: ['#ff6b3d', '#ffae3d', '#f5f24a'], colorBack: '#1c0e00' },
} satisfies Record<string, Palette>

/** Every palette is available for every shader. */
export const ALL_PALETTES: Palette[] = [
  PALETTES.configPop,
  PALETTES.sunburst,
  PALETTES.citrus,
  PALETTES.sunset,
  PALETTES.ember,
  PALETTES.aurora,
  PALETTES.mono,
]

export const DEFAULT_PALETTE_ID = ALL_PALETTES[0].id

export function getPalette(id: string): Palette {
  return ALL_PALETTES.find((p) => p.id === id) ?? ALL_PALETTES[0]
}

export const SHADERS: ShaderDef[] = [
  {
    id: 'mesh-gradient',
    label: 'Mesh',
    Component: MeshGradient as unknown as FC<Record<string, unknown>>,
    base: {},
    params: [
      { key: 'distortion', label: 'Distortion', min: 0.3, max: 1, step: 0.01, default: 0.8 },
      { key: 'swirl', label: 'Swirl', min: 0, max: 0.8, step: 0.01, default: 0.25 },
      { key: 'scale', label: 'Scale', min: 0.7, max: 2, step: 0.01, default: 1 },
    ],
  },
  {
    id: 'warp',
    label: 'Warp',
    Component: Warp as unknown as FC<Record<string, unknown>>,
    base: { shape: 'checks' },
    // The default 'checks' warp reads as muddy blobs at thumbnail size; warped stripes
    // convey the flowing-distortion feel far better.
    tile: { shape: 'stripes', distortion: 0.45, swirl: 0.85, proportion: 0.4, scale: 0.85 },
    params: [
      { key: 'distortion', label: 'Distortion', min: 0.1, max: 0.5, step: 0.01, default: 0.25 },
      { key: 'swirl', label: 'Swirl', min: 0.2, max: 1, step: 0.01, default: 0.6 },
      { key: 'proportion', label: 'Proportion', min: 0.2, max: 0.8, step: 0.01, default: 0.5 },
      { key: 'softness', label: 'Softness', min: 0.4, max: 1.5, step: 0.01, default: 1 },
      { key: 'scale', label: 'Scale', min: 0.6, max: 2, step: 0.01, default: 1 },
    ],
  },
  {
    id: 'grain-gradient',
    label: 'Grain',
    Component: GrainGradient as unknown as FC<Record<string, unknown>>,
    base: { shape: 'wave' },
    params: [
      { key: 'softness', label: 'Softness', min: 0.3, max: 0.9, step: 0.01, default: 0.6 },
      { key: 'intensity', label: 'Intensity', min: 0.3, max: 0.8, step: 0.01, default: 0.5 },
      { key: 'noise', label: 'Grain', min: 0.1, max: 0.7, step: 0.01, default: 0.35 },
      { key: 'scale', label: 'Scale', min: 0.7, max: 2, step: 0.01, default: 1 },
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
