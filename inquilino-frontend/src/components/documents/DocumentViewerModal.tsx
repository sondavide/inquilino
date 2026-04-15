import { useEffect, useRef, useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// ─── PDF worker (Vite resolves this to a static asset URL) ───────────────────
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentViewerModalProps {
  /** Returns the authenticated fetch Response for the document */
  fetchPreview: () => Promise<Response>
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentViewerModal({ fetchPreview, onClose }: DocumentViewerModalProps) {
  const [url,       setUrl]       = useState<string | null>(null)
  const [mimeType,  setMimeType]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
  const [zoom,      setZoom]      = useState(1)
  const [rotation,  setRotation]  = useState(0)   // 0 | 90 | 180 | 270
  const [numPages,  setNumPages]  = useState(0)
  const [page,      setPage]      = useState(1)
  const [panX,      setPanX]      = useState(0)
  const [panY,      setPanY]      = useState(0)

  const dragging      = useRef(false)
  const lastPointer   = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef<number | null>(null)
  const urlRef        = useRef<string | null>(null)
  const imgRef        = useRef<HTMLImageElement>(null)

  // ── Fetch blob ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchPreview()
      .then(async res => {
        if (cancelled) return
        const ct = res.headers.get('content-type') ?? 'image/jpeg'
        setMimeType(ct)
        const objectUrl = URL.createObjectURL(await res.blob())
        urlRef.current  = objectUrl
        setUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
      if (e.key === 'ArrowRight' && isPdf) setPage(p => Math.min(numPages, p + 1))
      if (e.key === 'ArrowLeft'  && isPdf) setPage(p => Math.max(1, p - 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, numPages])

  const isPdf = mimeType.includes('pdf')

  // ── Zoom helpers ────────────────────────────────────────────────────────────
  const clampZoom = (z: number) => Math.max(0.25, Math.min(5, z))

  const applyZoom = useCallback((newZoom: number) => {
    const clamped = clampZoom(newZoom)
    setZoom(clamped)
    if (clamped <= 1) { setPanX(0); setPanY(0) }
  }, [])

  const zoomIn  = () => applyZoom(zoom + 0.25)
  const zoomOut = () => applyZoom(zoom - 0.25)
  const fitZoom = () => { applyZoom(1); setPanX(0); setPanY(0) }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.12 : -0.12
    applyZoom(zoom + delta)
  }, [zoom, applyZoom])

  // ── Rotate ──────────────────────────────────────────────────────────────────
  const rotate = (dir: 1 | -1) => {
    setRotation(r => (r + dir * 90 + 360) % 360)
    setPanX(0); setPanY(0)
  }

  // ── Pan (pointer drag) ──────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return
    dragging.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setPanX(x => x + dx)
    setPanY(y => y + dy)
  }
  const onPointerUp = () => { dragging.current = false }

  // ── Pinch-to-zoom (touch) ───────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) lastPinchDist.current = pinchDist(e)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !lastPinchDist.current) return
    e.preventDefault()
    const d = pinchDist(e)
    applyZoom(zoom * (d / lastPinchDist.current))
    lastPinchDist.current = d
  }
  const onTouchEnd = () => { lastPinchDist.current = null }

  // ── Fit image to viewport on first load ─────────────────────────────────────
  const handleImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (!nw || !nh) return
    const maxW = window.innerWidth  - 32
    const maxH = window.innerHeight - 88   // toolbar height ≈ 48px + padding
    const scale = Math.min(1, maxW / nw, maxH / nh)
    setZoom(scale)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col select-none"
      style={{ touchAction: 'none', background: 'rgba(10, 10, 18, 0.94)', backdropFilter: 'blur(6px)' }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 bg-black/70 backdrop-blur border-b border-white/10">

        {/* Zoom */}
        <TBtn onClick={zoomOut}  label="Zoom out" disabled={zoom <= 0.25}>−</TBtn>
        <button
          onClick={fitZoom}
          title="Reset zoom (100%)"
          className="text-xs text-white/60 hover:text-white w-11 text-center tabular-nums transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <TBtn onClick={zoomIn}  label="Zoom in"  disabled={zoom >= 5}>+</TBtn>

        <Sep />

        {/* Rotate */}
        <TBtn onClick={() => rotate(-1)} label="Ruota a sinistra">
          <RotateLeftIcon />
        </TBtn>
        <TBtn onClick={() => rotate(1)} label="Ruota a destra">
          <RotateRightIcon />
        </TBtn>

        {/* PDF page navigation */}
        {isPdf && numPages > 1 && (
          <>
            <Sep />
            <TBtn onClick={() => setPage(p => Math.max(1, p - 1))}        label="Pagina precedente" disabled={page <= 1}>‹</TBtn>
            <span className="text-xs text-white/50 tabular-nums px-1">{page} / {numPages}</span>
            <TBtn onClick={() => setPage(p => Math.min(numPages, p + 1))} label="Pagina successiva"  disabled={page >= numPages}>›</TBtn>
          </>
        )}

        <div className="flex-1" />

        {/* Close */}
        <TBtn onClick={onClose} label="Chiudi">
          <CloseIcon />
        </TBtn>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full border-[3px] border-white/15 border-t-white/70 animate-spin" />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/50">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm">Impossibile caricare il documento.</p>
          <button onClick={onClose} className="text-xs text-white/40 hover:text-white/80 underline transition-colors">Chiudi</button>
        </div>
      )}

      {/* ── Image viewer ────────────────────────────────────────────────── */}
      {url && !loading && !isPdf && (
        <div
          className="flex-1 overflow-hidden flex items-center justify-center"
          style={{ cursor: zoom > 1 ? (dragging.current ? 'grabbing' : 'grab') : 'default' }}
          onWheel={handleWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            ref={imgRef}
            src={url}
            onLoad={handleImgLoad}
            draggable={false}
            alt="Documento"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          />
        </div>
      )}

      {/* ── PDF viewer ──────────────────────────────────────────────────── */}
      {url && !loading && isPdf && (
        <div
          className="flex-1 overflow-auto flex flex-col items-center justify-start py-6 gap-4 bg-zinc-900"
          onWheel={handleWheel}
        >
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage(1) }}
            loading={null}
            error={<p className="text-white/50 text-sm mt-12">Errore nel rendering del PDF.</p>}
          >
            <Page
              pageNumber={page}
              scale={zoom}
              rotate={rotation}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={null}
            />
          </Document>
        </div>
      )}

      {/* ── Backdrop click to close (only when not dragging) ─────────────── */}
      {/* No — the modal is full screen, close via button or Escape only */}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TBtn({
  onClick, label, disabled, children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="w-9 h-9 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none shrink-0"
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />
}

function RotateLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  )
}

function RotateRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pinchDist(e: React.TouchEvent) {
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}
