import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import { DEFAULT_DEVICE_ID } from '../devices/presets'
import {
  DEFAULT_SHADER_ID,
  SHADERS,
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
  colorMode: 'auto' | 'manual'
  manualColor: string
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
  qr: QrConfig
  /** Luminance of the shader behind the QR (sampled from the preview), for auto color. */
  backgroundLuminance: number | null
}

const MAX_SEED = 9999

function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED)
}

const initialShader = getShader(DEFAULT_SHADER_ID)

export const initialState: ConfigState = {
  url: '',
  deviceId: DEFAULT_DEVICE_ID,
  shaderId: DEFAULT_SHADER_ID,
  paletteId: initialShader.palettes[0].id,
  params: defaultParams(initialShader),
  seed: 2500,
  qr: {
    scale: 0.36,
    posX: 0.5,
    posY: 0.5,
    rounded: true,
    colorMode: 'auto',
    manualColor: '#0b0b10',
    blendMode: 'normal',
  },
  backgroundLuminance: null,
}

type Action =
  | { type: 'SET_URL'; url: string }
  | { type: 'SET_DEVICE'; deviceId: string }
  | { type: 'SET_SHADER'; shaderId: string }
  | { type: 'SET_PALETTE'; paletteId: string }
  | { type: 'SET_PARAM'; key: string; value: number }
  | { type: 'SET_SEED'; value: number }
  | { type: 'SET_QR'; patch: Partial<QrConfig> }
  | { type: 'SET_BG_LUMINANCE'; value: number | null }
  | { type: 'RANDOMIZE_BACKGROUND' }

function randomizeShader(def: ShaderDef): { paletteId: string; params: Record<string, number> } {
  const palette = pick(def.palettes)
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
      return {
        ...state,
        shaderId: def.id,
        paletteId: def.palettes[0].id,
        params: defaultParams(def),
      }
    }
    case 'SET_PALETTE':
      return { ...state, paletteId: action.paletteId }
    case 'SET_PARAM':
      return { ...state, params: { ...state.params, [action.key]: action.value } }
    case 'SET_SEED':
      return { ...state, seed: action.value }
    case 'SET_QR':
      return { ...state, qr: { ...state.qr, ...action.patch } }
    case 'SET_BG_LUMINANCE':
      return { ...state, backgroundLuminance: action.value }
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
