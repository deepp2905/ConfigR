/**
 * Picking the QR fill (light vs dark) from the background, by contrast rather than by eye.
 *
 * The intuitive rule — "average the background, use black if it's above 50% brightness" —
 * is wrong twice over. Perceived brightness isn't the mean of the sRGB channels (green
 * carries ~72% of luminance, blue ~7%), and the light/dark crossover isn't at 50%: solving
 * contrast(L, white) = contrast(L, black) puts it at L ≈ 0.1791. A mid-grey backdrop wants
 * *light* modules, which surprises people.
 *
 * So: compute WCAG relative luminance per sampled color, then the real contrast ratio
 * against each candidate, and keep whichever scores better.
 */

/** sRGB hex → [r, g, b] in 0–255. Accepts #rgb and #rrggbb. */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Undo the sRGB transfer function for one channel (0–255 → linear 0–1). */
function linearize(channel8: number): number {
  const c = channel8 / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG 2.x relative luminance, 0 (black) → 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG contrast ratio between two luminances, 1 (identical) → 21 (black on white). */
export function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** Contrast between two colors given as hex. */
export function contrastBetween(a: string, b: string): number {
  return contrastRatio(relativeLuminance(a), relativeLuminance(b))
}

/** Practical floor for QR module/background separation. */
const MIN_RATIO = 3

export interface FillChoice {
  /** The winning fill color (one of the two candidates passed in). */
  color: string
  /** Fraction of sampled cells where the winner clears MIN_RATIO, 0–1. */
  coverage: number
  /** Same fraction for the loser — the margin of the decision. */
  runnerUpCoverage: number
  /** Median contrast ratio the winner achieves. */
  medianRatio: number
  /** True when the winner still leaves a meaningful share of the QR under-contrasted. */
  risky: boolean
}

/**
 * Choose between two candidate fills for a background sampled across the QR's footprint.
 *
 * Scored by *how much of the QR clears the 3:1 floor*, not by the single worst cell and
 * not by the mean. Both alternatives were tried against the real shaders and both are
 * wrong here:
 *
 *   - Worst-case (maximize the minimum ratio) is decided entirely by one outlier cell.
 *     On a gradient spanning L 0.005–0.399 it chose the fill that failed 21 of 36 cells
 *     over the one that failed only 8, because that one had a marginally better floor.
 *   - Mean/median luminance ignores spread: a footprint half very dark and half very
 *     bright averages to a mid-tone that describes no part of the actual background.
 *
 * Counting cells asks the question that matters — how much of this QR is readable — and
 * degrades sensibly, since a scanner tolerates a few weak modules but not a weak half.
 */
export function pickFill(
  backgroundColors: string[],
  candidateA: string,
  candidateB: string,
): FillChoice {
  const bgLuminances = backgroundColors.map(relativeLuminance)

  const score = (candidate: string) => {
    const cl = relativeLuminance(candidate)
    const ratios = bgLuminances.map((bl) => contrastRatio(cl, bl)).sort((x, y) => x - y)
    const passing = ratios.filter((r) => r >= MIN_RATIO).length
    return {
      coverage: ratios.length ? passing / ratios.length : 0,
      median: ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1,
    }
  }

  const a = score(candidateA)
  const b = score(candidateB)
  // Ties broken on median ratio: same coverage, prefer the stronger separation overall.
  const aWins = a.coverage !== b.coverage ? a.coverage > b.coverage : a.median >= b.median

  return {
    color: aWins ? candidateA : candidateB,
    coverage: aWins ? a.coverage : b.coverage,
    runnerUpCoverage: aWins ? b.coverage : a.coverage,
    medianRatio: aWins ? a.median : b.median,
    // Under ~70% of the footprint clearing 3:1, the background is the problem, not the fill.
    risky: Math.max(a.coverage, b.coverage) < 0.7,
  }
}

/**
 * Average color of a rectangular region of a canvas, as a hex string.
 * Region is given in 0–1 fractions of the canvas, so it doesn't care about pixel size.
 *
 * Samples on a coarse grid rather than every pixel: the QR footprint can be ~300k pixels
 * in the preview and several million at export size, and a 24×24 grid lands within a
 * fraction of a percent of the true mean for the smooth gradients these shaders produce.
 */
export function sampleRegionColors(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; w: number; h: number },
  grid = 6,
): string[] {
  const scratch = document.createElement('canvas')
  scratch.width = grid
  scratch.height = grid
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  const sx = Math.max(0, Math.floor(region.x * canvas.width))
  const sy = Math.max(0, Math.floor(region.y * canvas.height))
  const sw = Math.max(1, Math.floor(region.w * canvas.width))
  const sh = Math.max(1, Math.floor(region.h * canvas.height))

  // Downscaling to a grid×grid target makes the GPU do the averaging: each destination
  // pixel is the mean of its source block.
  try {
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, grid, grid)
  } catch {
    return []
  }

  const { data } = ctx.getImageData(0, 0, grid, grid)
  const out: string[] = []
  for (let i = 0; i < data.length; i += 4) {
    // Fully transparent cells carry no background information.
    if (data[i + 3] === 0) continue
    const hex =
      '#' +
      [data[i], data[i + 1], data[i + 2]]
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('')
    out.push(hex)
  }
  return out
}
