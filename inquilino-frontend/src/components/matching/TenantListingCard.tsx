import { useRef, useState, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { resolveMediaUrl } from '@/lib/utils'
import MatchBadge from './MatchBadge'
import type { ListingCardDto } from '@/types'
import { buildTenantListingAnalysis } from '@/lib/tenantAnalysis'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SWIPE_THRESHOLD = 50  // px horizontal

interface Props {
  m:          ListingCardDto
  onLike:     () => void
  onDislike:  () => void
  isLoading?: boolean
}

const PROPERTY: Record<string, string> = {
  APARTMENT: 'Appartamento', STUDIO: 'Monolocale', LOFT: 'Loft',
  PENTHOUSE: 'Attico', HOUSE: 'Casa', VILLA: 'Villa',
  ROOM: 'Stanza', BED_IN_SHARED_ROOM: 'Posto letto', OTHER: 'Altro',
}

function CompatChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
      ok
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        : 'bg-white/10 text-white/50 border-white/20'
    }`}>
      {ok ? '✓' : '–'} {label}
    </span>
  )
}

export default function TenantListingCard({ m, onLike, onDislike, isLoading }: Props) {
  const [photoIdx,  setPhotoIdx]  = useState(0)
  const [expanded,  setExpanded]  = useState(false)
  const [likeAnim,  setLikeAnim]  = useState(false)
  const [skipAnim,  setSkipAnim]  = useState(false)

  const images = m.allImageUrls?.length
    ? m.allImageUrls
    : m.coverImageUrl ? [m.coverImageUrl] : []

  // Reset when card changes
  useEffect(() => {
    setPhotoIdx(0)
    setExpanded(false)
  }, [m.matchId])

  // ── Horizontal swipe on photo ───────────────────────────────────────────────
  const photoStart = useRef<{ x: number; y: number; pointerId: number } | null>(null)

  const onPhotoDown = useCallback((e: React.PointerEvent) => {
    photoStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPhotoUp = useCallback((e: React.PointerEvent) => {
    if (!photoStart.current || photoStart.current.pointerId !== e.pointerId) return
    const dx = e.clientX - photoStart.current.x
    const dy = Math.abs(e.clientY - photoStart.current.y)
    if (Math.abs(dx) > SWIPE_THRESHOLD && dy < 40) {
      if (dx < 0) setPhotoIdx(i => Math.min(i + 1, images.length - 1))
      else        setPhotoIdx(i => Math.max(i - 1, 0))
    }
    photoStart.current = null
  }, [images.length])

  // ── Sheet drag ──────────────────────────────────────────────────────────────
  const sheetStart = useRef<{ y: number; pointerId: number } | null>(null)

  const onSheetDown = useCallback((e: React.PointerEvent) => {
    sheetStart.current = { y: e.clientY, pointerId: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onSheetUp = useCallback((e: React.PointerEvent) => {
    if (!sheetStart.current || sheetStart.current.pointerId !== e.pointerId) return
    const dy = e.clientY - sheetStart.current.y
    if (dy > 60) setExpanded(false)
    sheetStart.current = null
  }, [])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleLike = () => {
    if (isLoading) return
    setLikeAnim(true)
    setTimeout(() => { setLikeAnim(false); onLike() }, 300)
  }

  const handleDislike = () => {
    if (isLoading) return
    setSkipAnim(true)
    setTimeout(() => { setSkipAnim(false); onDislike() }, 300)
  }

  // ── Map ─────────────────────────────────────────────────────────────────────
  const mapLat = m.matchState === 'CONTACT_UNLOCKED' && m.exactLat ? m.exactLat : m.displayLat
  const mapLng = m.matchState === 'CONTACT_UNLOCKED' && m.exactLng ? m.exactLng : m.displayLng
  const isExact = m.matchState === 'CONTACT_UNLOCKED' && m.exactLat != null

  // ── Features ────────────────────────────────────────────────────────────────
  const featureItems = [
    m.surfaceSqm      && `${m.surfaceSqm} m²`,
    m.roomsCount      && `${m.roomsCount} locali`,
    m.bedroomsCount   && `${m.bedroomsCount} camere`,
    m.bathroomsCount  && `${m.bathroomsCount} bagni`,
    m.floorNumber != null && `Piano ${m.floorNumber}`,
    m.elevator        && 'Ascensore',
    m.petsAllowed     && 'Animali OK',
    m.smokingAllowed  && 'Fumo OK',
    m.furnishedStatus && m.furnishedStatus.replace(/_/g, ' ').toLowerCase(),
  ].filter(Boolean) as string[]

  const title = m.title ?? PROPERTY[m.propertyType] ?? m.propertyType

  const coverUrl = images[photoIdx] ? resolveMediaUrl(images[photoIdx]) : null

  return (
    <div className={`
      relative w-full h-full overflow-hidden rounded-3xl select-none
      transition-transform duration-300
      ${likeAnim ? 'scale-95 ring-4 ring-emerald-400' : ''}
      ${skipAnim  ? 'scale-95 ring-4 ring-red-400'    : ''}
    `}>

      {/* ── Photo ────────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-gray-900 touch-pan-y"
        style={{ cursor: 'grab' }}
        onPointerDown={onPhotoDown}
        onPointerUp={onPhotoUp}
      >
        {coverUrl
          ? <img src={coverUrl} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
          : <div className="w-full h-full flex items-center justify-center text-6xl">🏠</div>
        }

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* ── Match badge ───────────────────────────────────────────────────────── */}
      {m.matchBand && (
        <div className="absolute top-4 right-4 z-10">
          <MatchBadge band={m.matchBand} size="sm" />
        </div>
      )}

      {/* ── Photo dots ────────────────────────────────────────────────────────── */}
      {images.length > 1 && (
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-10">
          {images.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === photoIdx ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Collapsed info overlay (shown when sheet is closed) ───────────────── */}
      <div
        className={`absolute inset-x-0 bottom-[68px] z-10 px-4 pb-3 transition-opacity duration-300 cursor-pointer ${
          expanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setExpanded(true)}
      >
        {/* Title + price */}
        <p className="text-white font-bold text-xl leading-tight line-clamp-1 drop-shadow">{title}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          {m.monthlyRent && (
            <p className="text-emerald-400 font-bold text-lg drop-shadow">
              €{m.monthlyRent.toLocaleString('it-IT')}
              <span className="text-sm font-normal text-white/70">/mese</span>
            </p>
          )}
          <p className="text-white/60 text-sm truncate">
            {[m.district, m.municipality].filter(Boolean).join(', ')}
          </p>
        </div>
        {/* Compat chips */}
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          <CompatChip ok={m.areaCompatible}   label="Zona" />
          <CompatChip ok={m.priceCompatible}  label="Prezzo" />
          <CompatChip ok={m.timingCompatible} label="Timing" />
        </div>
        {/* Pull up indicator */}
        <div className="flex justify-center mt-2">
          <div className="w-8 h-1 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* ── Detail bottom sheet ───────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-[68px] bg-white rounded-t-3xl z-20 overflow-hidden
                   transition-transform duration-350 ease-in-out"
        style={{ transform: expanded ? 'translateY(0)' : 'translateY(100%)', maxHeight: '78%' }}
      >
        {/* Drag handle area */}
        <div
          className="px-4 pt-3 pb-1 cursor-pointer"
          onPointerDown={onSheetDown}
          onPointerUp={onSheetUp}
          onClick={() => setExpanded(false)}
        >
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {/* Title + price recap */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-gray-900 text-base leading-tight">{title}</p>
            {m.matchBand && <MatchBadge band={m.matchBand} size="sm" />}
          </div>
          {m.monthlyRent && (
            <p className="text-emerald-700 font-bold text-lg mt-0.5">
              €{m.monthlyRent.toLocaleString('it-IT')}
              <span className="text-sm font-normal text-gray-500">/mese</span>
            </p>
          )}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-4 space-y-3" style={{ maxHeight: 'calc(78vh - 100px)' }}>

          {/* Compat chips */}
          <div className="flex gap-2 flex-wrap">
            {([
              { ok: m.areaCompatible,   label: 'Zona' },
              { ok: m.priceCompatible,  label: 'Prezzo' },
              { ok: m.timingCompatible, label: 'Timing' },
            ] as const).map(({ ok, label }) => (
              <span key={label} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                ok
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}>
                {ok ? '✓' : '–'} {label}
              </span>
            ))}
          </div>

          {/* Listing compatibility analysis — tenant perspective */}
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">🏠 Analisi compatibilità</p>
            <p className="text-blue-800 text-xs leading-relaxed">{m.tenantMatchSummary ?? buildTenantListingAnalysis(m)}</p>
          </div>

          {/* Approximate map */}
          {mapLat && mapLng && (
            <div className="rounded-xl overflow-hidden" style={{ height: 160 }}>
              <MapContainer
                center={[mapLat, mapLng]}
                zoom={isExact ? 15 : 13}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {isExact
                  ? <Marker position={[mapLat, mapLng]} />
                  : <Circle center={[mapLat, mapLng]} radius={400} pathOptions={{ color: '#3b82f6', fillOpacity: 0.15 }} />
                }
              </MapContainer>
            </div>
          )}

          {/* Location */}
          <p className="text-xs text-gray-500">
            {[m.district, m.municipality].filter(Boolean).join(', ')}
            {m.matchState === 'CONTACT_UNLOCKED' && m.fullAddress && ` · ${m.fullAddress}`}
          </p>

          {/* Features */}
          {featureItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {featureItems.map((f, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{f}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {m.description && (
            <p className="text-gray-600 text-xs leading-relaxed">{m.description}</p>
          )}

          {/* Availability */}
          {m.availableFrom && (
            <p className="text-xs text-gray-400">
              Disponibile dal {new Date(m.availableFrom).toLocaleDateString('it-IT')}
            </p>
          )}

          {/* Contacts if unlocked */}
          {m.matchState === 'CONTACT_UNLOCKED' && (
            <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-emerald-700">📞 Contatti sbloccati</p>
              {m.landlordDisplayName  && <p className="text-xs text-gray-700">{m.landlordDisplayName}</p>}
              {m.landlordContactPhone && <a href={`tel:${m.landlordContactPhone}`} className="text-xs text-blue-600 block">{m.landlordContactPhone}</a>}
              {m.landlordContactEmail && <a href={`mailto:${m.landlordContactEmail}`} className="text-xs text-blue-600 block">{m.landlordContactEmail}</a>}
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar ────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 h-[68px] z-30 flex items-center gap-3 px-4 bg-white border-t border-gray-100">
        <button
          onClick={handleDislike}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                     bg-white border-2 border-red-200 text-red-500 font-semibold text-sm
                     hover:bg-red-50 active:scale-95 transition disabled:opacity-50"
        >
          <span className="text-lg">✕</span>
          Non mi piace
        </button>
        <button
          onClick={handleLike}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                     bg-emerald-500 text-white font-semibold text-sm
                     hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50"
        >
          <span className="text-lg">❤</span>
          Mi piace
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-40 rounded-3xl">
          <span className="text-gray-500 text-sm">…</span>
        </div>
      )}
    </div>
  )
}
