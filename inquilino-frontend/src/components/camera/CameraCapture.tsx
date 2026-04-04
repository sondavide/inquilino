import { useEffect, useRef, useState, useCallback } from 'react'
import { useLang } from '@/i18n'
import { loadOpenCV, detectDocumentQuality, isOpenCVReady } from '@/lib/documentDetector'

type TranslationKey = Parameters<ReturnType<typeof useLang>['t']>[0]

// ─── Guide config per specific doc type ──────────────────────────────────────

const GUIDE_CONFIG: Record<string, { ratio: number; portrait: boolean; labelKey: string; icon: string }> = {
  IDENTITY_CARD:    { ratio: 85.6 / 53.98, portrait: false, labelKey: 'camera.doc.identity_card',   icon: '🪪' },
  PASSPORT:         { ratio: 88  / 125,    portrait: true,  labelKey: 'camera.doc.passport',         icon: '📕' },
  DRIVING_LICENSE:  { ratio: 85.6 / 53.98, portrait: false, labelKey: 'camera.doc.driving_license',  icon: '🚗' },
  INCOME_PAYSLIP:   { ratio: 210 / 297,    portrait: true,  labelKey: 'camera.doc.income_payslip',   icon: '💰' },
  TAX_RETURN:       { ratio: 210 / 297,    portrait: true,  labelKey: 'camera.doc.tax_return',        icon: '📋' },
  TAX_DECLARATION:  { ratio: 210 / 297,    portrait: true,  labelKey: 'camera.doc.tax_declaration',  icon: '📋' },
  INCOME_STATEMENT: { ratio: 210 / 297,    portrait: true,  labelKey: 'camera.doc.income_statement', icon: '🏦' },
}

// Backend type → selectable camera options (sub-type expansion)
const BACKEND_TO_OPTIONS: Record<string, string[]> = {
  IDENTITY:           ['IDENTITY_CARD', 'PASSPORT', 'DRIVING_LICENSE'],
  PAYSLIP:            ['INCOME_PAYSLIP'],
  TAX_RETURN:         ['TAX_RETURN'],
  GUARANTOR_DOCUMENT: ['INCOME_PAYSLIP', 'TAX_RETURN'],
  BANK_STATEMENT:     ['INCOME_STATEMENT'],
  LANDLORD_REFERENCE: ['TAX_RETURN'],  // A4 letter
}

function expandOptions(expectedTypes: string[]): string[] {
  const result: string[] = []
  for (const t of expectedTypes) {
    const expanded = BACKEND_TO_OPTIONS[t]
    if (expanded) result.push(...expanded)
    else if (t in GUIDE_CONFIG) result.push(t)
  }
  return result.length > 0 ? result : Object.keys(GUIDE_CONFIG)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase   = 'select' | 'capture' | 'preview'
type Quality = 'poor' | 'ok' | 'good'

interface CameraCaptureProps {
  expectedTypes: string[]
  onCapture: (file: File) => void
  onClose:   () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CameraCapture({ expectedTypes, onCapture, onClose }: CameraCaptureProps) {
  const { t } = useLang()
  const options = expandOptions(expectedTypes)

  const [phase,        setPhase]        = useState<Phase>(options.length === 1 ? 'capture' : 'select')
  const [selectedType, setSelectedType] = useState<string>(options.length === 1 ? options[0] : '')
  const [quality,      setQuality]      = useState<Quality>('poor')
  const [countdown,    setCountdown]    = useState<number | null>(null)
  const [cameraError,  setCameraError]  = useState(false)
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [cvReady,      setCvReady]      = useState(isOpenCVReady)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const analysisRef   = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef<number>(0)
  const goodSinceRef  = useRef<number | null>(null)
  const didCaptureRef = useRef(false)
  const lastAnalysisRef = useRef<number>(0)

  const guide = selectedType ? (GUIDE_CONFIG[selectedType] ?? null) : null

  // ─── Capture: snapshot → preview ─────────────────────────────────────────

  const doCapture = useCallback(() => {
    if (didCaptureRef.current) return
    didCaptureRef.current = true
    cancelAnimationFrame(rafRef.current)

    const video = videoRef.current
    if (!video) return

    const screenW = window.innerWidth
    const screenH = window.innerHeight
    const vidW    = video.videoWidth
    const vidH    = video.videoHeight

    // object-cover: scale so the video fills the entire screen
    const scale   = Math.max(screenW / vidW, screenH / vidH)
    const offsetX = (screenW - vidW * scale) / 2
    const offsetY = (screenH - vidH * scale) / 2

    // Guide dimensions on screen (mirrors guideStyle)
    let guideW: number
    if (guide) {
      guideW = guide.portrait ? Math.min(screenW * 0.62, 240) : Math.min(screenW * 0.86, 360)
    } else {
      guideW = Math.min(screenW * 0.75, 300)
    }
    const guideH = guide ? guideW / guide.ratio : guideW

    // Guide is centered on screen
    const guideScreenX = (screenW - guideW) / 2
    const guideScreenY = (screenH - guideH) / 2

    // Map guide screen coords → video source coords (inverse of object-cover transform)
    const srcX = (guideScreenX - offsetX) / scale
    const srcY = (guideScreenY - offsetY) / scale
    const srcW = guideW / scale
    const srcH = guideH / scale

    // Clamp to video frame bounds
    const cx = Math.max(0, srcX)
    const cy = Math.max(0, srcY)
    const cw = Math.min(srcW, vidW - cx)
    const ch = Math.min(srcH, vidH - cy)

    const snap = document.createElement('canvas')
    snap.width  = Math.round(cw)
    snap.height = Math.round(ch)
    snap.getContext('2d')!.drawImage(video, cx, cy, cw, ch, 0, 0, snap.width, snap.height)
    snap.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], `doc_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPreviewUrl(URL.createObjectURL(blob))
      setCapturedFile(file)
      setPhase('preview')
    }, 'image/jpeg', 0.92)
  }, [guide])

  // ─── Frame analysis (quality feedback + auto-capture) ────────────────────
  //
  // Throttled to every 300 ms to avoid blocking the main thread.
  // Uses OpenCV.js (loaded lazily) to find the largest contour in the central
  // 70% of the frame via Canny edge detection + findContours.
  // A rectangular document produces a large, well-defined contour;
  // a random scene typically does not.

  const analyzeFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = analysisRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }

    const now = Date.now()
    if (now - lastAnalysisRef.current >= 300) {
      lastAnalysisRef.current = now
      const q = detectDocumentQuality(video, canvas) as Quality
      setQuality(q)

      if (q === 'good') {
        if (!goodSinceRef.current) goodSinceRef.current = now
        const elapsed = now - goodSinceRef.current
        setCountdown(Math.max(0, Math.ceil((2200 - elapsed) / 1000)))
        if (elapsed >= 2200) { doCapture(); return }
      } else {
        goodSinceRef.current = null
        setCountdown(null)
      }
    }

    rafRef.current = requestAnimationFrame(analyzeFrame)
  }, [doCapture])

  // ─── Camera lifecycle (starts/restarts when phase === 'capture') ──────────

  useEffect(() => {
    if (phase !== 'capture') return

    didCaptureRef.current = false
    goodSinceRef.current  = null
    lastAnalysisRef.current = 0
    setQuality('poor')
    setCountdown(null)

    let cancelled = false

    // Load OpenCV.js first (no-op if already loaded), then start the camera
    loadOpenCV().then(() => {
      if (!cancelled) setCvReady(true)
    })

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        rafRef.current = requestAnimationFrame(analyzeFrame)
      })
      .catch(() => setCameraError(true))

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [phase, analyzeFrame])

  // Revoke object URL when preview URL changes or on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  // ─── Retake ───────────────────────────────────────────────────────────────

  const handleRetake = () => {
    setPreviewUrl(null)
    setCapturedFile(null)
    setPhase('capture')
  }

  // ─── Phase: select ────────────────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-white font-semibold text-sm">{t('camera.select.title')}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl w-9 h-9 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3 px-6 pb-8">
          {options.map(opt => {
            const cfg = GUIDE_CONFIG[opt]
            if (!cfg) return null
            return (
              <button
                key={opt}
                onClick={() => { setSelectedType(opt); setPhase('capture') }}
                className="flex items-center gap-4 w-full bg-white/10 hover:bg-white/20
                           active:scale-[0.98] rounded-2xl px-5 py-4 text-left transition-all"
              >
                <span className="text-3xl w-10 text-center shrink-0">{cfg.icon}</span>
                <span className="text-white font-medium text-base">
                  {t(cfg.labelKey as TranslationKey)}
                </span>
                <span className="ml-auto text-white/40 text-lg">›</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Phase: error ─────────────────────────────────────────────────────────

  if (cameraError) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white text-center text-sm">{t('camera.error')}</p>
        <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white text-black font-medium text-sm">
          {t('camera.close')}
        </button>
      </div>
    )
  }

  // ─── Phase: preview ───────────────────────────────────────────────────────

  if (phase === 'preview' && previewUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center overflow-hidden px-4 pt-4">
          <img
            src={previewUrl}
            alt="Captured document"
            className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
          />
        </div>
        <div className="flex gap-3 px-6 pb-10 pt-5 bg-black/70">
          <button
            onClick={handleRetake}
            className="flex-1 py-3.5 rounded-2xl border-2 border-white/40 text-white font-semibold text-sm
                       hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            {t('camera.preview.retake')}
          </button>
          <button
            onClick={() => capturedFile && onCapture(capturedFile)}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm
                       hover:bg-emerald-400 active:scale-[0.98] transition-all"
          >
            {t('camera.preview.use')}
          </button>
        </div>
      </div>
    )
  }

  // ─── Phase: capture ───────────────────────────────────────────────────────

  const statusText =
    quality === 'good'
      ? countdown !== null && countdown > 0
        ? t('camera.status.good.countdown', { n: countdown })
        : t('camera.status.good')
      : quality === 'ok'
      ? t('camera.status.ok')
      : t('camera.status.poor')

  const guideStyle: React.CSSProperties = guide
    ? guide.portrait
      ? { width: 'min(62vw, 240px)', aspectRatio: String(guide.ratio) }
      : { width: 'min(86vw, 360px)', aspectRatio: String(guide.ratio) }
    : { width: 'min(75vw, 300px)', aspectRatio: '1' }

  const color = quality === 'good' ? '#22c55e' : quality === 'ok' ? '#eab308' : 'rgba(255,255,255,0.7)'

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-3
                      bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => options.length > 1 ? setPhase('select') : onClose()}
          className="text-white/80 hover:text-white w-9 h-9 flex items-center justify-center text-xl"
        >
          ←
        </button>
        <span className="text-white text-sm font-medium">
          {guide ? t(guide.labelKey as TranslationKey) : t('camera.doc.default')}
        </span>
        <button onClick={onClose} className="text-white/80 hover:text-white w-9 h-9 flex items-center justify-center text-xl">
          ✕
        </button>
      </div>

      {/* Live video */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={analysisRef} className="hidden" />

      {/* OpenCV loading overlay — shown until WASM is initialized */}
      {!cvReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70">
          <span className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <span className="text-white text-xs">Caricamento rilevamento documenti…</span>
        </div>
      )}

      {/* Guide overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{
          ...guideStyle,
          boxShadow: `0 0 0 9999px rgba(0,0,0,0.52)`,
          border: `2px solid ${color}`,
          borderRadius: 10,
          transition: 'border-color 0.25s',
          position: 'relative',
        }}>
          {(['tl','tr','bl','br'] as const).map(c => (
            <span key={c} style={{
              position: 'absolute', width: 22, height: 22,
              top:    c[0] === 't' ? -2 : undefined, bottom: c[0] === 'b' ? -2 : undefined,
              left:   c[1] === 'l' ? -2 : undefined, right:  c[1] === 'r' ? -2 : undefined,
              borderTop:    c[0] === 't' ? `3px solid ${color}` : undefined,
              borderBottom: c[0] === 'b' ? `3px solid ${color}` : undefined,
              borderLeft:   c[1] === 'l' ? `3px solid ${color}` : undefined,
              borderRight:  c[1] === 'r' ? `3px solid ${color}` : undefined,
              borderRadius: c === 'tl' ? '4px 0 0 0' : c === 'tr' ? '0 4px 0 0'
                          : c === 'bl' ? '0 0 0 4px'  : '0 0 4px 0',
              transition: 'border-color 0.25s',
            }} />
          ))}
        </div>
      </div>

      {/* Status label */}
      <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none">
        <span
          className="px-4 py-1.5 rounded-full text-xs font-medium text-white shadow"
          style={{ backgroundColor: quality === 'good' ? '#15803d' : quality === 'ok' ? '#b45309' : 'rgba(0,0,0,0.6)' }}
        >
          {statusText}
        </span>
      </div>

      {/* Shutter button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={doCapture}
          className="w-16 h-16 rounded-full bg-white border-[3px] border-gray-300 shadow-xl active:scale-95 transition-transform"
          aria-label="Scatta foto"
        />
      </div>
    </div>
  )
}
