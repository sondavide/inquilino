import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useLang }        from '@/i18n'
import { useAuth }        from '@/hooks/useAuth'
import { tenantMatchApi } from '@/api/matching'
import type { ListingCardDto } from '@/types'
import MatchBadge         from '@/components/matching/MatchBadge'
import MutualMatchCelebration from '@/components/matching/MutualMatchCelebration'
import { resolveMediaUrl } from '@/lib/utils'

// ─── Lookup tables ────────────────────────────────────────────────────────────

const PROPERTY: Record<string, string> = {
  APARTMENT: 'Appartamento', STUDIO: 'Monolocale', LOFT: 'Loft',
  PENTHOUSE: 'Attico',       HOUSE: 'Casa',        VILLA: 'Villa',
  ROOM: 'Stanza',  BED_IN_SHARED_ROOM: 'Posto letto',  OTHER: 'Altro',
}

const LISTING_TYPE: Record<string, string> = {
  LONG_TERM_RENT:    'Affitto residenziale',
  SHORT_TERM_RENT:   'Affitto breve',
  TRANSITIONAL_RENT: 'Affitto transitorio',
  STUDENT_RENT:      'Affitto studentesco',
  ROOM_RENT:         'Stanza in affitto',
}

const FURNISHED: Record<string, string> = {
  FURNISHED:           'Arredato',
  PARTIALLY_FURNISHED: 'Parzialmente arredato',
  UNFURNISHED:         'Non arredato',
}

// ─── Utility components ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-0">{children}</h3>
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[55%]">{value}</span>
    </div>
  )
}

function CompatChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-gray-50 text-gray-400 border-gray-200'
    }`}>
      <span>{ok ? '✓' : '–'}</span> {label}
    </span>
  )
}

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

// ─── Mappa posizione approssimativa ──────────────────────────────────────────

function SetMapView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 14) }, [lat, lng])
  return null
}

function ApproxMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 160 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        dragging={false}
        scrollWheelZoom={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <SetMapView lat={lat} lng={lng} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle center={[lat, lng]} radius={250} pathOptions={{ color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 0.35, weight: 2 }} />
      </MapContainer>
    </div>
  )
}

// ─── Corpo scheda (comune mobile e desktop) ───────────────────────────────────

function ListingBody({ card }: { card: ListingCardDto }) {
  const propertyLabel = PROPERTY[card.propertyType] ?? card.propertyType
  const listingLabel  = LISTING_TYPE[card.listingType] ?? card.listingType
  const furnishedLabel = card.furnishedStatus ? FURNISHED[card.furnishedStatus] ?? card.furnishedStatus.replace(/_/g,' ') : null

  const location = [card.district, card.municipality].filter(Boolean).join(', ')
  const address  = card.matchState === 'CONTACT_UNLOCKED' && card.fullAddress
    ? card.fullAddress
    : location

  // Costo totale stimato
  const totalCost = (card.monthlyRent ?? 0) + (card.condominiumFees ?? 0)

  // Caratteristiche strutturali
  const structuralRows: { label: string; value: React.ReactNode }[] = [
    card.surfaceSqm      != null && { label: 'Superficie',          value: `${card.surfaceSqm} m²` },
    card.roomsCount      != null && { label: 'Locali',              value: card.roomsCount },
    card.bedroomsCount   != null && { label: 'Camere da letto',     value: card.bedroomsCount },
    card.bathroomsCount  != null && { label: 'Bagni',               value: card.bathroomsCount },
    card.floorNumber     != null && { label: 'Piano',               value: card.floorNumber },
                                    { label: 'Ascensore',           value: card.elevator ? 'Sì' : 'No' },
    furnishedLabel                && { label: 'Arredamento',         value: furnishedLabel },
                                    { label: 'Animali ammessi',     value: card.petsAllowed ? 'Sì' : 'No' },
                                    { label: 'Fumo',                value: card.smokingAllowed ? 'Consentito' : 'Non consentito' },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[]

  return (
    <div className="bg-white">

      {/* ── PREZZO ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 md:px-6 md:pt-5 border-b border-gray-100">
        <div className="flex items-end gap-3">
          <div>
            {card.monthlyRent ? (
              <>
                <span className="text-3xl font-bold text-gray-900">
                  € {card.monthlyRent.toLocaleString('it-IT')}
                </span>
                <span className="text-base text-gray-500 ml-1">al mese</span>
              </>
            ) : (
              <span className="text-xl text-gray-400">Prezzo non indicato</span>
            )}
          </div>
          {card.matchBand && (
            <div className="mb-0.5 ml-auto">
              <MatchBadge band={card.matchBand} size="sm" />
            </div>
          )}
        </div>

        {/* Spese aggiuntive */}
        {(card.condominiumFees || !card.utilitiesIncluded) && (
          <div className="mt-1.5 space-y-0.5">
            {card.condominiumFees != null && (
              <p className="text-xs text-gray-400">
                + € {card.condominiumFees.toLocaleString('it-IT')} spese condominiali
              </p>
            )}
            <p className="text-xs text-gray-400">
              Utenze: {card.utilitiesIncluded ? 'incluse' : 'escluse'}
            </p>
            {totalCost > (card.monthlyRent ?? 0) && (
              <p className="text-xs font-semibold text-gray-600">
                Totale stimato: € {totalCost.toLocaleString('it-IT')}/mese
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── TIPO + INDIRIZZO ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 md:px-6 border-b border-gray-100">
        <p className="font-semibold text-gray-900 text-base">
          {propertyLabel} · {listingLabel}
        </p>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
          <span>📍</span> {address}
        </p>
      </div>

      {/* ── COMPATIBILITÀ ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 md:px-6 border-b border-gray-100">
        <div className="flex gap-2 flex-wrap">
          <CompatChip ok={card.areaCompatible}   label="Zona" />
          <CompatChip ok={card.priceCompatible}  label="Prezzo" />
          <CompatChip ok={card.timingCompatible} label="Timing" />
        </div>
      </div>

      {/* ── DESCRIZIONE ──────────────────────────────────────────────────────── */}
      {(card.matchSummary || card.description) && (
        <div className="px-4 pt-4 pb-3 md:px-6 border-b border-gray-100 space-y-3">
          <SectionTitle>Descrizione</SectionTitle>

          {card.matchSummary && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                <span>🤖</span> Analisi compatibilità
              </p>
              <p className="text-blue-800 text-xs leading-relaxed">{card.matchSummary}</p>
            </div>
          )}

          {card.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{card.description}</p>
          )}
        </div>
      )}

      {/* ── POSIZIONE ────────────────────────────────────────────────────────── */}
      {card.displayLat != null && card.displayLng != null && (
        <div className="px-4 pt-4 pb-3 md:px-6 border-b border-gray-100">
          <SectionTitle>Posizione</SectionTitle>
          <p className="text-xs text-gray-400 mb-2">Posizione approssimativa</p>
          <ApproxMap lat={card.displayLat} lng={card.displayLng} />
        </div>
      )}

      {/* ── CARATTERISTICHE ──────────────────────────────────────────────────── */}
      {structuralRows.length > 0 && (
        <div className="px-4 pt-4 pb-1 md:px-6 border-b border-gray-100">
          <SectionTitle>Caratteristiche</SectionTitle>
          <div className="mt-2">
            {structuralRows.map((row, i) => (
              <DetailRow key={i} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      )}

      {/* ── COSTI ────────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-1 md:px-6 border-b border-gray-100">
        <SectionTitle>Costi</SectionTitle>
        <div className="mt-2">
          {card.monthlyRent != null && (
            <DetailRow label="Canone mensile" value={`€ ${card.monthlyRent.toLocaleString('it-IT')}`} />
          )}
          {card.condominiumFees != null && (
            <DetailRow label="Spese condominiali" value={`€ ${card.condominiumFees.toLocaleString('it-IT')}`} />
          )}
          <DetailRow
            label="Utenze"
            value={card.utilitiesIncluded ? 'Incluse nel canone' : 'A carico dell\'inquilino'}
          />
          {totalCost > (card.monthlyRent ?? 0) && (
            <DetailRow
              label="Costo totale stimato"
              value={<span className="font-bold text-gray-900">€ {totalCost.toLocaleString('it-IT')}</span>}
            />
          )}
        </div>
      </div>

      {/* ── DISPONIBILITÀ ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-1 md:px-6 border-b border-gray-100">
        <SectionTitle>Disponibilità</SectionTitle>
        <div className="mt-2">
          {card.availableFrom && (
            <DetailRow
              label="Disponibile dal"
              value={new Date(card.availableFrom).toLocaleDateString('it-IT', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            />
          )}
          <DetailRow label="Tipo contratto" value={listingLabel} />
        </div>
      </div>

      {/* ── CONTATTI (CONTACT_UNLOCKED) ───────────────────────────────────────── */}
      {card.matchState === 'CONTACT_UNLOCKED' && (
        <div className="px-4 pt-4 pb-3 md:px-6 border-b border-gray-100">
          <SectionTitle>Contatti</SectionTitle>
          <div className="mt-3 bg-emerald-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <span>🔓</span> Contatti sbloccati
            </p>
            {card.landlordDisplayName  && <p className="text-sm text-gray-800 font-medium">{card.landlordDisplayName}</p>}
            {card.landlordContactPhone && (
              <a href={`tel:${card.landlordContactPhone}`} className="text-sm text-blue-600 block">
                📞 {card.landlordContactPhone}
              </a>
            )}
            {card.landlordContactEmail && (
              <a href={`mailto:${card.landlordContactEmail}`} className="text-sm text-blue-600 block">
                ✉️ {card.landlordContactEmail}
              </a>
            )}
            {card.fullAddress && (
              <p className="text-sm text-gray-600">📍 {card.fullAddress}</p>
            )}
          </div>
        </div>
      )}

      {/* Spazio finale per non coprire il footer */}
      <div className="h-2" />
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function TenantMatchesPage() {
  const { t }    = useLang()
  const { user } = useAuth()

  const [queue,         setQueue]         = useState<ListingCardDto[]>([])
  const [current,       setCurrent]       = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [photoIdx,      setPhotoIdx]      = useState(0)
  const [fading,        setFading]        = useState(false)
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
  const card   = queue[current] ?? null
  const images = card
    ? (card.allImageUrls?.length ? card.allImageUrls : card.coverImageUrl ? [card.coverImageUrl] : [])
    : []

  useEffect(() => {
    setLoading(true)
    tenantMatchApi.list()
      .then(data => { setQueue(data); setCurrent(0) })
      .catch(() => setError('Errore nel caricamento'))
      .finally(() => setLoading(false))
  }, [])

  const advance = useCallback((updatedCard?: ListingCardDto) => {
    if (updatedCard) setQueue(q => q.map((m, i) => i === current ? updatedCard : m))
    setFading(true)
    setTimeout(() => { setCurrent(i => i + 1); setPhotoIdx(0); setFading(false) }, 220)
  }, [current])

  const handleLike = async () => {
    if (!card || actionLoading) return
    setActionLoading(true)
    try {
      const u = await tenantMatchApi.expressInterest(card.matchId)
      if (u.matchState === 'MUTUAL_INTEREST') setShowCelebration(true)
      advance(u)
    }
    catch { advance() }
    finally { setActionLoading(false) }
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
      <p className="text-4xl">{queue.length === 0 ? '🔍' : '✅'}</p>
      <p className="font-semibold text-gray-700">
        {queue.length === 0 ? t('matches.tenant.empty' as any) : 'Hai esaminato tutti gli annunci!'}
      </p>
      {queue.length > 0 && <p className="text-sm text-gray-500">Controlla i tuoi match nella tab Match</p>}
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
          <span className="text-xs text-gray-400">Annuncio {current + 1} di {queue.length}</span>
          <div className="flex gap-1">
            {queue.slice(0, Math.min(queue.length, 7)).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                i < current ? 'bg-gray-300' : i === current ? 'bg-emerald-500' : 'bg-gray-200'
              }`} />
            ))}
          </div>
        </div>

        {/* Contenuto scrollabile */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <ListingBody card={card} />
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
            <span>Annuncio {current + 1} di {queue.length}</span>
            <div className="flex gap-1">
              {queue.slice(0, Math.min(queue.length, 7)).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                  i < current ? 'bg-white/40' : i === current ? 'bg-white' : 'bg-white/20'
                }`} />
              ))}
            </div>
          </div>
        </div>

        {/* Destra: dettagli scrollabili + footer */}
        <div className="relative flex-1 flex flex-col min-h-0 border-l border-gray-100">

          {/* Contenuto scrollabile */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-20">
            <ListingBody card={card} />
          </div>

          <ActionButtons className="md:px-6 md:py-4" />
        </div>
      </div>

    </div>
    </>
  )
}
