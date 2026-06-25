import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import { DEFAULT_DEVICE_ID } from '../devices/presets'
import {
  DEFAULT_SHADER_ID,
  DEFAULT_PALETTE_ID,
  SHADERS,
  ALL_PALETTES,
  getShader,
  defaultParams,
  type ShaderDef,
} from '../shaders/registry'
import { pick, randFloat, snap } from '../lib/random'

export interface QrConfig {
  /** QR width as a fraction of the wallpaper width. */
  scale: number
  /** Center position in normalized 0..1 coords. */
  posX: number
  posY: number
  rounded: boolean
  /** Module color — black or white. */
  color: string
  /** 0..1 opacity of the QR over the shader. */
  opacity: number
  /** CSS mix-blend-mode / canvas composite op for the QR over the shader. */
  blendMode: string
}

export interface ConfigState {
  url: string
  deviceId: string
  shaderId: string
  paletteId: string
  params: Record<string, number>
  /** Deterministic frame offset for the (static) shader — acts as a pattern seed. */
  seed: number
  /** Immersive QR treatment. */
  qrStyle: QrStyle
  qr: QrConfig
  /** Whether the Config wordmark watermark is shown on the wallpaper. */
  showConfigMark: boolean
}

export const QR_WHITE = '#f6f6fb'
export const QR_BLACK = '#0b0b10'

/** Immersive QR treatments — how the QR sits within the shader. */
export type QrStyle = 'dynamic' | 'duotone' | 'dots'

export const QR_STYLES: { id: QrStyle; label: string }[] = [
  { id: 'dynamic', label: 'Cutout' },
  { id: 'duotone', label: 'Solid' },
  { id: 'dots', label: 'Dots' },
]

const MAX_SEED = 9999

function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED)
}

const initialShader = getShader(DEFAULT_SHADER_ID)

export const initialState: ConfigState = {
  url: '',
  deviceId: DEFAULT_DEVICE_ID,
  shaderId: DEFAULT_SHADER_ID,
  paletteId: DEFAULT_PALETTE_ID,
  params: defaultParams(initialShader),
  seed: 2500,
  qrStyle: 'duotone',
  qr: {
    scale: 0.396,
    posX: 0.5,
    posY: 0.5,
    rounded: true,
    color: QR_WHITE,
    opacity: 1,
    blendMode: 'overlay',
  },
  showConfigMark: true,
}

type Action =
  | { type: 'SET_URL'; url: string }
  | { type: 'SET_DEVICE'; deviceId: string }
  | { type: 'SET_SHADER'; shaderId: string }
  | { type: 'SET_PALETTE'; paletteId: string }
  | { type: 'SET_PARAM'; key: string; value: number }
  | { type: 'SET_SEED'; value: number }
  | { type: 'SET_QR_STYLE'; value: QrStyle }
  | { type: 'SET_QR'; patch: Partial<QrConfig> }
  | { type: 'SET_SHOW_CONFIG_MARK'; value: boolean }
  | { type: 'RANDOMIZE_BACKGROUND' }

function randomizeShader(def: ShaderDef): { paletteId: string; params: Record<string, number> } {
  const palette = pick(ALL_PALETTES)
  const params: Record<string, number> = {}
  for (const p of def.params) {
    params[p.key] = snap(randFloat(p.min, p.max), p.step)
  }
  return { paletteId: palette.id, params }
}

function reducer(state: ConfigState, action: Action): ConfigState {
  switch (action.type) {
    case 'SET_URL':
      return { ...state, url: action.url }
    case 'SET_DEVICE':
      return { ...state, deviceId: action.deviceId }
    case 'SET_SHADER': {
      const def = getShader(action.shaderId)
      // Keep the current palette — every palette works with every shader.
      return { ...state, shaderId: def.id, params: defaultParams(def) }
    }
    case 'SET_PALETTE':
      return { ...state, paletteId: action.paletteId }
    case 'SET_PARAM':
      return { ...state, params: { ...state.params, [action.key]: action.value } }
    case 'SET_SEED':
      return { ...state, seed: action.value }
    case 'SET_QR_STYLE':
      return { ...state, qrStyle: action.value }
    case 'SET_QR':
      return { ...state, qr: { ...state.qr, ...action.patch } }
    case 'SET_SHOW_CONFIG_MARK':
      return { ...state, showConfigMark: action.value }
    case 'RANDOMIZE_BACKGROUND': {
      const def = pick(SHADERS)
      const { paletteId, params } = randomizeShader(def)
      return { ...state, shaderId: def.id, paletteId, params, seed: randomSeed() }
    }
    default:
      return state
  }
}

const StateContext = createContext<ConfigState | null>(null)
const DispatchContext = createContext<Dispatch<Action> | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useConfig(): ConfigState {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useConfig must be used within StoreProvider')
  return ctx
}

export function useDispatchConfig(): Dispatch<Action> {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error('useDispatchConfig must be used within StoreProvider')
  return ctx
}
