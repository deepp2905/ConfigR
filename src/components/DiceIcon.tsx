/** A die face (rounded square + 1–6 pips) drawn with currentColor. */
const POS: Record<string, [number, number]> = {
  tl: [8, 8],
  tr: [16, 8],
  ml: [8, 12],
  mr: [16, 12],
  bl: [8, 16],
  br: [16, 16],
  c: [12, 12],
}

const FACES: Record<number, string[]> = {
  1: ['c'],
  2: ['tl', 'br'],
  3: ['tl', 'c', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
}

export function DiceIcon({ value }: { value: number }) {
  const pips = FACES[value] ?? FACES[1]
  return (
    <svg
      className="icon-dice"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="4.5" stroke="currentColor" strokeWidth="2" />
      {pips.map((p) => {
        const [cx, cy] = POS[p]
        return <circle key={p} cx={cx} cy={cy} r="1.7" fill="currentColor" />
      })}
    </svg>
  )
}
