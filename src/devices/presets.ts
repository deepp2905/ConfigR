export interface DevicePreset {
  id: string
  label: string
  /** Native portrait pixel dimensions used for export. */
  width: number
  height: number
  group: 'iPhone' | 'Samsung' | 'Pixel' | 'Generic'
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'portrait-9-16', label: 'Default 9:16', width: 1080, height: 1920, group: 'Generic' },
  { id: 'iphone-pro-max', label: 'iPhone 15/16 Pro Max', width: 1290, height: 2796, group: 'iPhone' },
  { id: 'iphone-pro', label: 'iPhone 15/16 (Pro)', width: 1179, height: 2556, group: 'iPhone' },
  { id: 'iphone-se', label: 'iPhone SE', width: 750, height: 1334, group: 'iPhone' },
  { id: 'samsung-s24-ultra', label: 'Galaxy S24 Ultra', width: 1440, height: 3120, group: 'Samsung' },
  { id: 'samsung-s24', label: 'Galaxy S24', width: 1080, height: 2340, group: 'Samsung' },
  { id: 'pixel-8-pro', label: 'Pixel 8 Pro', width: 1344, height: 2992, group: 'Pixel' },
  { id: 'pixel-8', label: 'Pixel 8', width: 1080, height: 2400, group: 'Pixel' },
]

export const DEFAULT_DEVICE_ID = 'iphone-pro'

export function getDevice(id: string): DevicePreset {
  return DEVICE_PRESETS.find((d) => d.id === id) ?? DEVICE_PRESETS[0]
}
