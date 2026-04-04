/**
 * Document presence detector using OpenCV.js.
 *
 * Loads /public/opencv.js (copied from jscanify's bundle via postinstall).
 * Uses Gaussian blur → Canny edge detection → findContours to locate the
 * largest rectangular contour in the central region of the video frame.
 * A document (ID card, passport, payslip) produces a large, clean rectangle;
 * a random scene typically does not.
 */

// ─── OpenCV singleton load ────────────────────────────────────────────────────

type CV = Record<string, unknown>

let _cv: CV | null = null
let _loading = false
const _queue: Array<() => void> = []

export function loadOpenCV(): Promise<void> {
  return new Promise<void>(resolve => {
    if (_cv) { resolve(); return }
    _queue.push(resolve)
    if (_loading) return
    _loading = true

    const script = document.createElement('script')
    script.async = true
    script.src = '/opencv.js'
    script.onload = () => {
      // opencv.js sets window.cv and fires onRuntimeInitialized when WASM is ready
      const poll = setInterval(() => {
        const cv = (window as Record<string, unknown>).cv as CV | undefined
        if (cv && typeof cv['Mat'] === 'function') {
          clearInterval(poll)
          _cv = cv
          _queue.forEach(cb => cb())
          _queue.length = 0
        }
      }, 100)
    }
    script.onerror = () => {
      // If /opencv.js is missing the camera will fall back to the basic heuristic
      clearInterval(undefined)
      _loading = false
      _queue.forEach(cb => cb())
      _queue.length = 0
    }
    document.head.appendChild(script)
  })
}

export function isOpenCVReady(): boolean {
  return _cv !== null
}

// ─── Detection ────────────────────────────────────────────────────────────────

export type DocQuality = 'poor' | 'ok' | 'good'

/**
 * Draws the video frame to `canvas` (320×240) and runs OpenCV contour
 * detection to find the largest rectangle in the central 70% of the frame.
 *
 * Returns:
 *   'good' — document fills > 22% of the frame area (well-positioned)
 *   'ok'   — document fills 9–22% (partially there, needs to be closer)
 *   'poor' — nothing useful detected
 */
export function detectDocumentQuality(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): DocQuality {
  const cv = _cv
  if (!cv) return 'poor'

  try {
    const W = 320, H = 240
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    // Crop to central 70% of the frame — the guide overlay lives here
    const mx = video.videoWidth  * 0.15
    const my = video.videoHeight * 0.15
    ctx.drawImage(
      video,
      mx, my,
      video.videoWidth  * 0.70,
      video.videoHeight * 0.70,
      0, 0, W, H,
    )

    // OpenCV pipeline: grayscale → blur → Canny edges → contours
    const src       = (cv as any).imread(canvas)
    const gray      = new (cv as any).Mat()
    const blurred   = new (cv as any).Mat()
    const edges     = new (cv as any).Mat()
    const contours  = new (cv as any).MatVector()
    const hierarchy = new (cv as any).Mat()

    ;(cv as any).cvtColor(src, gray, (cv as any).COLOR_RGBA2GRAY)
    ;(cv as any).GaussianBlur(gray, blurred, new (cv as any).Size(5, 5), 0)
    ;(cv as any).Canny(blurred, edges, 40, 180)
    ;(cv as any).findContours(
      edges, contours, hierarchy,
      (cv as any).RETR_CCOMP,
      (cv as any).CHAIN_APPROX_SIMPLE,
    )

    // Find the largest contour by area
    let maxArea = 0
    const n = contours.size()
    for (let i = 0; i < n; i++) {
      const area = (cv as any).contourArea(contours.get(i))
      if (area > maxArea) maxArea = area
    }

    // Clean up — MUST delete all Mat/MatVector to avoid memory leaks
    src.delete(); gray.delete(); blurred.delete()
    edges.delete(); contours.delete(); hierarchy.delete()

    const ratio = maxArea / (W * H)
    if (ratio > 0.22) return 'good'
    if (ratio > 0.09) return 'ok'
    return 'poor'

  } catch {
    return 'poor'
  }
}
