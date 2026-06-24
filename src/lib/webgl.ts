/**
 * The shader backgrounds are rendered with WebGL2 (@paper-design/shaders). When WebGL2
 * isn't available (hardware acceleration off, old/blocked GPU, etc.) the canvases never
 * paint and the preview shows blank white — so we detect support up front and show a
 * friendly "not supported" message instead.
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}
