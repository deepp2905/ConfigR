import { useEffect, useState } from 'react'
import { pickFill, sampleRegionColors, type FillChoice } from './contrast'
import { QR_WHITE, QR_BLACK } from '../state/store'

/**
 * Watches the shader under the QR and reports which fill color reads better there.
 *
 * Deliberately advisory: it returns a suggestion rather than dispatching a change, so the
 * user's explicit color choice is never overwritten while they're working. The caller
 * decides whether to surface it.
 */
export function useAutoFill(
  frameRef: React.RefObject<HTMLElement | null>,
  /** QR footprint in 0–1 fractions of the frame. */
  region: { x: number; y: number; w: number; h: number },
  /** Re-sample when this changes (shader id, palette, seed, params…). */
  deps: unknown,
): FillChoice | null {
  const [choice, setChoice] = useState<FillChoice | null>(null)

  useEffect(() => {
    // The shader needs a painted frame before the buffer holds anything readable.
    const handle = setTimeout(() => {
      const canvas = frameRef.current?.querySelector('canvas')
      if (!canvas) return
      const colors = sampleRegionColors(canvas, region)
      if (!colors.length) return
      setChoice(pickFill(colors, QR_WHITE, QR_BLACK))
    }, 180)
    return () => clearTimeout(handle)
  }, [frameRef, region.x, region.y, region.w, region.h, deps])

  return choice
}
