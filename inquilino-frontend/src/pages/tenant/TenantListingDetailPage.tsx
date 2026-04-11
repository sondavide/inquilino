import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLang } from '@/i18n'
import { tenantMatchApi } from '@/api/matching'
import type { ListingCardDto } from '@/types'
import MatchBadge from '@/components/matching/MatchBadge'
import { TenantMatchCTA } from '@/components/matching/MatchStateCTA'
import { buildTenantListingAnalysis } from '@/lib/tenantAnalysis'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function TenantListingDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { t } = useLang()

  const [match,   setMatch]   = useState<ListingCardDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx,  setImgIdx]  = useState(0)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const load = useCallback(() => {
    if (!matchId) return
    tenantMatchApi.get(matchId)
      .then(setMatch)
      .finally(() => setLoading(false))
  }, [matchId])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingScreen />
  if (!match)  return <NotFound onBack={() => navigate('/matches')} />

  const displayLat = match.exactLat  ?? match.displayLat
  const displayLng = match.exactLng  ?? match.displayLng
  const hasExact   = match.matchState === 'CONTACT_UNLOCKED' && match.exactLat != null
  const showJitter = !hasExact && displayLat != null

  const updateMatch = async (fn: () => Promise<ListingCardDto>) => {
    const updated = await fn()
    setMatch(updated)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Back nav */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/matches')} className="text-sm text-blue-600">
          {t('match.listing.back')}
        </button>
        <MatchBadge band={match.matchBand} size="sm" />
      </div>

      {/* Photo gallery */}
      {match.allImageUrls.length > 0 && (
        <div
          className="relative bg-black h-64 sm:h-80 touch-pan-y select-none"
          onPointerDown={e => {
            swipeStart.current = { x: e.clientX, y: e.clientY }
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          }}
          onPointerUp={e => {
            if (!swipeStart.current) return
            const dx = e.clientX - swipeStart.current.x
            const dy = Math.abs(e.clientY - swipeStart.current.y)
            if (Math.abs(dx) > 40 && dy < 60) {
              const total = match.allImageUrls.length
              setImgIdx(i => dx < 0
                ? Math.min(i + 1, total - 1)
                : Math.max(i - 1, 0))
            }
            swipeStart.current = null
          }}
        >
          <img
            src={match.allImageUrls[imgIdx]}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          {match.allImageUrls.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {match.allImageUrls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-5">

        {/* Title + price */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900 flex-1">
              {match.title ?? t(`propertyType.${match.propertyType}` as any)}
            </h1>
            {match.monthlyRent && (
              <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
                €{match.monthlyRent.toLocaleString()}/mo
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            📍 {[match.streetName, match.district, match.municipality].filter(Boolean).join(', ')}
          </p>
          {match.condominiumFees && (
            <p className="text-xs text-gray-400 mt-0.5">
              + €{match.condominiumFees}/mo spese cond.
              {match.utilitiesIncluded && ' · utenze incluse'}
            </p>
          )}
        </div>

        {/* Compatibility badges */}
        <div className="flex flex-wrap gap-1.5">
          {match.priceCompatible  && <Badge label={t('match.badge.price')}  color="green"  />}
          {match.areaCompatible   && <Badge label={t('match.badge.area')}   color="blue"   />}
          {match.timingCompatible && <Badge label={t('match.badge.timing')} color="purple" />}
        </div>

        {/* Listing compatibility analysis — tenant perspective */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">
            🏠 Analisi compatibilità
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">
            {buildTenantListingAnalysis(match)}
          </p>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <TenantMatchCTA
            matchId={match.matchId}
            state={match.matchState}
            onInterest={    () => updateMatch(() => tenantMatchApi.expressInterest(match.matchId))}
            onDismiss={     () => tenantMatchApi.dismiss(match.matchId).then(() => navigate('/matches'))}
            onAcceptInvite={ () => updateMatch(() => tenantMatchApi.acceptInvite(match.matchId))}
            onUnlock={      () => updateMatch(() => tenantMatchApi.unlockContact(match.matchId))}
          />
        </div>

        {/* Contact (CONTACT_UNLOCKED) */}
        {match.matchState === 'CONTACT_UNLOCKED' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-emerald-800 text-sm">{t('match.listing.contact.unlocked')}</p>
            {match.landlordDisplayName && (
              <p className="text-sm text-gray-700">{match.landlordDisplayName}</p>
            )}
            {match.landlordContactPhone && (
              <a href={`tel:${match.landlordContactPhone}`}
                 className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                📞 {match.landlordContactPhone}
              </a>
            )}
            {match.landlordContactEmail && (
              <a href={`mailto:${match.landlordContactEmail}`}
                 className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                ✉️ {match.landlordContactEmail}
              </a>
            )}
          </div>
        )}

        {/* Map */}
        {(displayLat != null && displayLng != null) && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 h-48">
            <MapContainer
              center={[displayLat, displayLng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              scrollWheelZoom={false}
              dragging={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {hasExact ? (
                <Marker position={[displayLat, displayLng]} />
              ) : (
                <Circle
                  center={[displayLat, displayLng]}
                  radius={200}
                  pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.15 }}
                />
              )}
            </MapContainer>
          </div>
        )}
        {showJitter && (
          <p className="text-xs text-gray-400 -mt-3 px-1">{t('match.listing.location_hint')}</p>
        )}

        {/* Features */}
        <Section title={t('match.listing.features')}>
          <FeatureGrid match={match} />
        </Section>

        {/* Availability */}
        <Section title={t('match.listing.availability')}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {match.availableFrom && (
              <Info label={t('match.listing.available_from')}
                    value={new Date(match.availableFrom).toLocaleDateString()} />
            )}
            <Info label="Animali" value={match.petsAllowed
              ? t('match.listing.pets_yes') : t('match.listing.pets_no')} />
            <Info label="Fumatori" value={match.smokingAllowed
              ? t('match.listing.smoking_yes') : t('match.listing.smoking_no')} />
          </div>
        </Section>

        {/* Description */}
        {match.description && (
          <Section title={t('match.listing.description')}>
            <p className="text-sm text-gray-700 whitespace-pre-line">{match.description}</p>
          </Section>
        )}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
      {children}
    </div>
  )
}

function FeatureGrid({ match }: { match: ListingCardDto }) {
  const { t } = useLang()
  const items = [
    match.surfaceSqm    && { icon: '📐', value: `${match.surfaceSqm} m²` },
    match.roomsCount    && { icon: '🚪', value: `${match.roomsCount} locali` },
    match.bedroomsCount && { icon: '🛏️', value: `${match.bedroomsCount} cam.` },
    match.bathroomsCount && { icon: '🚿', value: `${match.bathroomsCount} bagni` },
    match.floorNumber != null && { icon: '🏢', value: `Piano ${match.floorNumber}` },
    { icon: match.elevator ? '🛗' : '🚶', value: match.elevator
      ? t('match.listing.elevator_yes') : t('match.listing.elevator_no') },
    match.furnishedStatus && { icon: '🛋️', value: match.furnishedStatus === 'furnished'
      ? 'Arredato' : match.furnishedStatus === 'partially_furnished'
      ? 'Parz. arredato' : 'Non arredato' },
  ].filter(Boolean) as { icon: string; value: string }[]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 text-sm text-gray-700">
          <span>{it.icon}</span>
          <span>{it.value}</span>
        </div>
      ))}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'purple' }) {
  const cls = { green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700' }[color]
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Caricamento…
    </div>
  )
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-gray-500">Match non trovato.</p>
      <button onClick={onBack} className="text-blue-600 text-sm">Torna agli annunci</button>
    </div>
  )
}
