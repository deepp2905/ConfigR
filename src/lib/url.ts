/**
 * Normalize a user-typed link to a valid http(s) URL string, or return null if it isn't a
 * plausible URL. A bare host like "figma.com/config" is upgraded to "https://figma.com/config".
 */
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v || /\s/.test(v)) return null
  const candidate = /^[a-zA-Z][\w+.-]*:\/\//.test(v) ? v : `https://${v}`
  try {
    const u = new URL(candidate)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.href
  } catch {
    return null
  }
}

export function isValidUrl(raw: string): boolean {
  return normalizeUrl(raw) !== null
}
