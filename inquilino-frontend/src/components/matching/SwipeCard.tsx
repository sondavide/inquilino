import { useRef, useState, useCallback, useEffect } from 'react'
import { resolveMediaUrl } from '@/lib/utils'
import MatchBadge from './MatchBadge'
import { useLang } from '@/i18n'

/**
 * Tinder-style card container.
 * - Horizontal drag/swipe on the photo area: changes current photo
 * - Vertical drag/swipe up on the info panel: expands detail sheet
 * - Like/Dislike buttons at bottom: triggers action and advances to next card
 * - Works on both touch (mobile) and mouse (desktop/web) via Pointer Events API
 */

interface SwipeCardProps {
  images:     string[]
  band:       string | null
  onLike:     () => void
  onDislike:  () => void
  likeLabel?:    string
  dislikeLabel?: string
  /** Content shown in the collapsed info bar */
  infoContent:  React.ReactNode
  /** Content shown when the detail sheet is expanded */
  detailContent: React.ReactNode
  /** Optional: extra actions shown next to Like/Dislike */
  extraActions?: React.ReactNode
  isLoading?:  boolean
}

const SWIPE_THRESHOLD = 60     // px to trigger photo change
const EXPAND_THRESHOLD = 80    // px up to expand detail sheet

export default function SwipeCard({
  images,
  band,
  onLike,
  onDislike,
  likeLabel,
  dislikeLabel,
  infoContent,
  detailContent,
  extraActions,
  isLoading,
}: SwipeCardProps) {
  const { t } = useLang()
  const [photoIdx,    setPhotoIdx]    = useState(0)
  const [expanded,    setExpanded]    = useState(false)
  const [likeAnim,    setLikeAnim]    = useState(false)
  const [dislikeAnim, setDislikeAnim] = useState(false)

  // Reset photo index when card changes (parent re-renders with new data)
  useEffect(() => { setPhotoIdx(0); setExpanded(false) }, [images[0]])

  // ── Photo gesture ─────────────────────────────────────────────────────────
  const photoStart = useRef<{ x: number; pointerId: number } | null>(null)
  const photoRef   = useRef<HTMLDivElement>(null)

  const onPhotoPointerDown = useCallback((e: React.PointerEvent) => {
    photoStart.current = { x: e.clientX, pointerId: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPhotoPointerUp = useCallback((e: React.PointerEvent) => {
    if (!photoStart.current || photoStart.current.pointerId !== e.pointerId) return
    const dx = e.clientX - photoStart.current.x
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) setPhotoIdx(i => Math.min(i + 1, images.length - 1))
      else        setPhotoIdx(i => Math.max(i - 1, 0))
    }
    photoStart.current = null
  }, [images.length])

  // ── Detail sheet gesture ──────────────────────────────────────────────────
  const sheetStart = useRef<{ y: number; pointerId: number } | null>(null)

  const onSheetPointerDown = useCallback((e: React.PointerEvent) => {
    sheetStart.current = { y: e.clientY, pointerId: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onSheetPointerUp = useCallback((e: React.PointerEvent) => {
    if (!sheetStart.current || sheetStart.current.pointerId !== e.pointerId) return
    const dy = e.clientY - sheetStart.current.y
    if (!expanded && dy < -EXPAND_THRESHOLD) setExpanded(true)
    if (expanded  && dy >  EXPAND_THRESHOLD) setExpanded(false)
    sheetStart.current = null
  }, [expanded])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleLike = () => {
    setLikeAnim(true)
    setTimeout(() => { setLikeAnim(false); onLike() }, 350)
  }
  const handleDislike = () => {
    setDislikeAnim(true)
    setTimeout(() => { setDislikeAnim(false); onDislike() }, 350)
  }

  const coverUrl = images[photoIdx]
    ? resolveMediaUrl(images[photoIdx])
    : null

  return (
    <div className={`
      relative flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100
      transition-transform duration-300
      ${likeAnim    ? 'scale-95 ring-4 ring-emerald-400' : ''}
      ${dislikeAnim ? 'scale-95 ring-4 ring-red-400'     : ''}
    `}>

      {/* ── Photo area ─────────────────────────────────────────────────────── */}
      <div
        ref={photoRef}
        className="relative w-full select-none touch-pan-y"
        style={{ height: expanded ? '30vh' : '52vw', maxHeight: expanded ? 220 : 380,
                 minHeight: 180, cursor: 'grab', transition: 'height 0.35s ease' }}
        onPointerDown={onPhotoPointerDown}
        onPointerUp={onPhotoPointerUp}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-4xl">
            🏠
          </div>
        )}

        {/* Band badge */}
        {band && (
          <div className="absolute top-3 right-3">
            <MatchBadge band={band as any} size="sm" />
          </div>
        )}

        {/* Photo dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === photoIdx ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Info bar (always visible) ────────────────────────────────────────── */}
      <div
        className="px-4 pt-3 pb-1 cursor-pointer select-none"
        onPointerDown={onSheetPointerDown}
        onPointerUp={onSheetPointerUp}
        onClick={() => setExpanded(v => !v)}
      >
        {infoContent}
        {/* Pull indicator */}
        <div className="flex justify-center mt-1 mb-0.5">
          <div className="w-8 h-1 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* ── Detail sheet (expandable) ────────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-350 ease-in-out"
        style={{ maxHeight: expanded ? 600 : 0 }}
      >
        <div className="px-4 pb-3 space-y-3 overflow-y-auto" style={{ maxHeight: 600 }}>
          {detailContent}
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <button
          onClick={handleDislike}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                     bg-white border-2 border-red-200 text-red-500 font-semibold text-sm
                     hover:bg-red-50 active:scale-95 transition disabled:opacity-50"
        >
          <span className="text-lg">✕</span>
          {dislikeLabel ?? t('match.swipe.dislike' as any)}
        </button>

        {extraActions}

        <button
          onClick={handleLike}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                     bg-emerald-500 text-white font-semibold text-sm
                     hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50"
        >
          <span className="text-lg">❤</span>
          {likeLabel ?? t('match.swipe.like' as any)}
        </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-3xl">
          <span className="text-gray-400 text-sm">…</span>
        </div>
      )}
    </div>
  )
}
