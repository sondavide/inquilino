import { useEffect, useState, useRef, useCallback } from 'react'
import { useLang }        from '@/i18n'
import { useAuth }        from '@/hooks/useAuth'
import { tenantMatchApi } from '@/api/matching'
import type { ListingCardDto } from '@/types'
import MutualMatchCelebration from '@/components/matching/MutualMatchCelebration'
import ListingDetailBody  from '@/components/matching/ListingDetailBody'
import { resolveMediaUrl } from '@/lib/utils'

// ─── Galleria con blur fill ───────────────────────────────────────────────────

function Gallery({
  images, photoIdx, matchId, isDesktop, onPrev, onNext, onPointerDown, onPointerUp, onPointerCancel,
}: {
  images:          string[]
  photoIdx:        number
  matchId:         string
  isDesktop:       boolean
  onPrev:          () => void
  onNext:          () => void
  onPointerDown:   (e: React.PointerEvent) => void
  onPointerUp:     (e: React.PointerEvent) => void
  onPointerCancel: () => void
}) {
  const url = images[photoIdx] ? resolveMediaUrl(images[photoIdx]) : null

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-gray-900 select-none"
      style={{ cursor: images.length > 1 ? 'grab' : 'default', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {url ? (
        <>
          {/* Sfondo sfocato */}
          <img src={url} aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none"
               style={{ filter: 'blur(22px)', transform: 'scale(1.15)' }} draggable={false} />
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          {/* Foto principale */}
          <img key={`${matchId}-${photoIdx}`} src={url} alt=""
               className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-6xl">🏠</div>
      )}

      {/* Contatore foto */}
      {images.length > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-black/55 text-white text-xs font-medium px-2.5 py-1 rounded-full">
          {photoIdx + 1} / {images.length}
        </div>
      )}

      {/* Frecce desktop */}
      {isDesktop && images.length > 1 && (
        <>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onPrev}
            disabled={photoIdx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                       w-9 h-9 rounded-full bg-white/80 shadow flex items-center justify-center
                       text-gray-800 text-lg font-bold hover:bg-white transition disabled:opacity-30"
          >‹</button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onNext}
            disabled={photoIdx === images.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10
                       w-9 h-9 rounded-full bg-white/80 shadow flex items-center justify-center
                       text-gray-800 text-lg font-bold hover:bg-white transition disabled:opacity-30"
          >›</button>
        </>
      )}

      {/* Pallini (solo mobile) */}
      {!isDesktop && images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {images.map((_, i) => (
            <span key={i} className={`rounded-full transition-all ${
              i === photoIdx ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/45'
            }`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function TenantMatchesPage() {
  const { t }    = useLang()
  const { user } = useAuth()

  const [queue,            setQueue]            = useState<ListingCardDto[]>([])
  const [hadCards,         setHadCards]         = useState(false)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [photoIdx,         setPhotoIdx]         = useState(0)
  const [fading,           setFading]           = useState(false)
  const [actionLoading,    setActionLoading]    = useState(false)
  const [showCelebration,  setShowCelebration]  = useState(false)

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq      = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isVerified = user?.verificationStatus === 'VERIFIED'
  const card   = queue[0] ?? null
  const images = card
    ? (card.allImageUrls?.length ? card.allImageUrls : card.coverImageUrl ? [card.coverImageUrl] : [])
    : []

  const PENDING_STATES = ['ALGORITHMIC', 'LANDLORD_INTERESTED']

  useEffect(() => {
    setLoading(true)
    tenantMatchApi.list()
      .then(data => {
        const pending = data.filter(m => PENDING_STATES.includes(m.matchState))
        setQueue(pending)
        if (pending.length > 0) setHadCards(true)
      })
      .catch(() => setError('Errore nel caricamento'))
      .finally(() => setLoading(false))
  }, [])

  const advance = useCallback(() => {
    setFading(true)
    setTimeout(() => {
      setQueue(q => q.slice(1))
      setPhotoIdx(0)
      setFading(false)
    }, 220)
  }, [])

  const handleLike = async () => {
    if (!card || actionLoading) return
    setActionLoading(true)
    try {
      const u = await tenantMatchApi.expressInterest(card.matchId)
      if (u.matchState === 'MUTUAL_INTEREST') setShowCelebration(true)
    }
    catch { /* ignore */ }
    finally { setActionLoading(false) }
    advance()
  }

  const handleDislike = async () => {
    if (!card || actionLoading) return
    setActionLoading(true)
    try { await tenantMatchApi.dismiss(card.matchId) } catch { /* ignore */ }
    finally { setActionLoading(false) }
    advance()
  }

  // Swipe orizzontale galleria
  const gallStart = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const onGallDown = useCallback((e: React.PointerEvent) => {
    gallStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    // Niente setPointerCapture: permettiamo il click sui bottoni freccia figli
  }, [])
  const onGallUp = useCallback((e: React.PointerEvent) => {
    if (!gallStart.current || gallStart.current.pointerId !== e.pointerId) return
    const dx = e.clientX - gallStart.current.x
    const dy = Math.abs(e.clientY - gallStart.current.y)
    gallStart.current = null
    if (dy > 30 || Math.abs(dx) < 40) return
    if (dx < 0) setPhotoIdx(i => Math.min(i + 1, images.length - 1))
    else        setPhotoIdx(i => Math.max(i - 1, 0))
  }, [images.length])
  const onGallCancel = useCallback(() => { gallStart.current = null }, [])

  // ── Bottoni azione ──────────────────────────────────────────────────────────
  const ActionButtons = ({ className = '' }: { className?: string }) => (
    <div className={`absolute bottom-0 left-0 right-0 flex gap-3 px-4 py-3 bg-white border-t border-gray-100 ${className}`}>
      <button onClick={handleDislike} disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                         border-2 border-red-200 text-red-500 font-semibold text-sm bg-white
                         hover:bg-red-50 active:scale-95 transition disabled:opacity-50">
        ✕ Non mi interessa
      </button>
      <button onClick={handleLike} disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                         bg-emerald-500 text-white font-semibold text-sm
                         hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50">
        ❤ Mi piace
      </button>
    </div>
  )

  // ── Stati particolari ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
      {t('matches.tenant.loading' as any)}
    </div>
  )
  if (error) return (
    <div className="h-full flex items-center justify-center text-red-500 text-sm">{error}</div>
  )
  if (!isVerified) return (
    <div className="h-full flex flex-col items-center justify-center px-8 space-y-3 text-center">
      <p className="text-2xl">🔒</p>
      <p className="font-semibold text-amber-800">{t('matches.tenant.not_verified' as any)}</p>
      <p className="text-sm text-amber-700">{t('matches.tenant.not_verified.hint' as any)}</p>
    </div>
  )
  if (!card) return (
    <div className="h-full flex flex-col items-center justify-center space-y-2 px-8 text-center">
      <p className="text-4xl">{hadCards ? '✅' : '🔍'}</p>
      <p className="font-semibold text-gray-700">
        {hadCards ? 'Hai esaminato tutti gli annunci!' : t('matches.tenant.empty' as any)}
      </p>
      {hadCards && <p className="text-sm text-gray-500">Controlla i tuoi match nella tab Match</p>}
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    {showCelebration && (
      <MutualMatchCelebration onDone={() => setShowCelebration(false)} />
    )}
    <div
      className="h-full flex flex-col overflow-hidden bg-white"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.22s ease' }}
    >

      {/* ── MOBILE ─────────────────────────────────────────────────────────────
          Layout verticale: galleria fissa → contenuto scrollabile → footer fisso
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col h-full md:hidden overflow-hidden">

        {/* Galleria: altezza landscape ~58vw */}
        <div className="shrink-0" style={{ height: 'min(58vw, 300px)' }}>
          <Gallery
            images={images} photoIdx={photoIdx} matchId={card.matchId}
            isDesktop={false}
            onPrev={() => setPhotoIdx(i => Math.max(i - 1, 0))}
            onNext={() => setPhotoIdx(i => Math.min(i + 1, images.length - 1))}
            onPointerDown={onGallDown} onPointerUp={onGallUp} onPointerCancel={onGallCancel}
          />
        </div>

        {/* Progresso annunci */}
        <div className="shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-100
                        flex items-center justify-between">
          <span className="text-xs text-gray-400">{queue.length} {queue.length === 1 ? 'annuncio rimanente' : 'annunci rimanenti'}</span>
          <div className="flex gap-1">
            {queue.slice(0, Math.min(queue.length, 7)).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                i === 0 ? 'bg-emerald-500' : 'bg-gray-200'
              }`} />
            ))}
          </div>
        </div>

        {/* Contenuto scrollabile */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <ListingDetailBody card={card} px="px-4 md:px-6" />
        </div>

        <ActionButtons />
      </div>

      {/* ── DESKTOP ────────────────────────────────────────────────────────────
          Due colonne: galleria sinistra | dettagli+footer destra
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex h-full">

        {/* Sinistra: galleria full-height */}
        <div className="w-[58%] shrink-0 relative">
          <Gallery
            images={images} photoIdx={photoIdx} matchId={card.matchId}
            isDesktop={true}
            onPrev={() => setPhotoIdx(i => Math.max(i - 1, 0))}
            onNext={() => setPhotoIdx(i => Math.min(i + 1, images.length - 1))}
            onPointerDown={onGallDown} onPointerUp={onGallUp} onPointerCancel={onGallCancel}
          />

          {/* Progresso annunci sovrapposto in basso a sinistra */}
          <div className="absolute bottom-4 left-4 z-10
                          bg-black/55 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
            <span>{queue.length} {queue.length === 1 ? 'rimanente' : 'rimanenti'}</span>
            <div className="flex gap-1">
              {queue.slice(0, Math.min(queue.length, 7)).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                  i === 0 ? 'bg-white' : 'bg-white/20'
                }`} />
              ))}
            </div>
          </div>
        </div>

        {/* Destra: dettagli scrollabili + footer */}
        <div className="relative flex-1 flex flex-col min-h-0 border-l border-gray-100">

          {/* Contenuto scrollabile */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-20">
            <ListingDetailBody card={card} px="px-4 md:px-6" />
          </div>

          <ActionButtons className="md:px-6 md:py-4" />
        </div>
      </div>

    </div>
    </>
  )
}
