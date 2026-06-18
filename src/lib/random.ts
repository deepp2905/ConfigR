export function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randInt(min: number, max: number): number {
  return Math.round(randFloat(min, max))
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Snap a value to a step, used to keep randomized params on tidy increments. */
export function snap(value: number, step: number): number {
  if (!step) return value
  return Math.round(value / step) * step
}
