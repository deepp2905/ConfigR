export interface DevicePreset {
  id: string
  label: string
  /** Native portrait pixel dimensions used for export. */
  width: number
  height: number
}

/**
 * Phones are grouped by aspect ratio (devices that share a ratio produce the same wallpaper
 * shape), each kept at the highest resolution in its group so exports stay crisp everywhere:
 *  - 9:16    → 1080×1920 (covers iPhone SE, classic 16:9)
 *  - 19.5:9  → 1440×3120 (covers most iPhones + Samsung Galaxy)
 *  - 20:9    → 1344×2992 (covers Google Pixel)
 */
export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'r-19-5-9', label: '19.5 : 9', width: 1440, height: 3120 },
  { id: 'r-20-9', label: '20 : 9', width: 1344, height: 2992 },
  { id: 'r-9-16', label: '9 : 16', width: 1080, height: 1920 },
]

export const DEFAULT_DEVICE_ID = 'r-19-5-9'

export function getDevice(id: string): DevicePreset {
  return DEVICE_PRESETS.find((d) => d.id === id) ?? DEVICE_PRESETS[0]
}
