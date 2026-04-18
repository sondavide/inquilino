import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { resolveMediaUrl } from '../../lib/utils'
import {
  getSupervisorListing,
  approveListingField,
  flagListingField,
  resetListingField,
  completeListingValidation,
  recomputeListingMatches,
} from '../../api/listings'
import type { ListingDto, ListingFieldValidation } from '../../types'

// Fix Leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Icons ────────────────────────────────────────────────────────────────────

const declaredIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

const nominatimIcon = new L.DivIcon({
  html: '<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8], className: '',
})

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
              + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── MapFitTwo: fit bounds to two points ──────────────────────────────────────

function MapFitTwo({ p1, p2 }: { p1: [number, number]; p2: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds([p1, p2])
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
  }, [p1[0], p1[1], p2[0], p2[1]]) // eslint-disable-line
  return null
}

// ─── ReadOnlyMap ──────────────────────────────────────────────────────────────

function ReadOnlyMap({ lat, lng, nominatimLat, nominatimLng }: {
  lat: number; lng: number
  nominatimLat?: number; nominatimLng?: number
}) {
  const hasNominatim = nominatimLat != null && nominatimLng != null
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 mb-2 relative z-0">
      <MapContainer center={[lat, lng]} zoom={15}
        style={{ height: hasNominatim ? 240 : 200, width: '100%' }}
        scrollWheelZoom={false} dragging={false} zoomControl={false}
        doubleClickZoom={false} touchZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[lat, lng]} icon={declaredIcon} />
        {hasNominatim && (
          <>
            <Marker position={[nominatimLat!, nominatimLng!]} icon={nominatimIcon} />
            <MapFitTwo p1={[lat, lng]} p2={[nominatimLat!, nominatimLng!]} />
          </>
        )}
      </MapContainer>
      <div className="flex items-center gap-4 px-3 py-1.5 bg-gray-50 text-xs text-gray-500">
        <span>📌 {lat.toFixed(5)}, {lng.toFixed(5)}</span>
        {hasNominatim && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            {nominatimLat!.toFixed(5)}, {nominatimLng!.toFixed(5)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── GeocodeCheck ─────────────────────────────────────────────────────────────

const GEO_THRESHOLD_KM = 5

function GeocodeCheck({ listing }: { listing: ListingDto }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'warning' | 'notfound'>('idle')
  const [nominatimPt, setNominatimPt] = useState<{ lat: number; lng: number } | null>(null)
  const [distKm, setDistKm]           = useState<number | null>(null)

  const hasCoords = listing.location?.lat != null && listing.location?.lng != null

  const verify = async () => {
    setState('loading')
    const parts = [
      listing.location?.fullAddress ?? [listing.location?.streetName, listing.location?.streetNumber].filter(Boolean).join(' '),
      listing.location?.municipality,
      listing.location?.province,
      'Italia',
    ].filter(Boolean).join(', ')

    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&countrycodes=it&limit=1`,
        { headers: { 'Accept-Language': 'it' } }
      )
      const data = await res.json()
      if (!data.length) { setState('notfound'); return }
      const nLat = parseFloat(data[0].lat)
      const nLng = parseFloat(data[0].lon)
      const dist = haversineKm(listing.location!.lat!, listing.location!.lng!, nLat, nLng)
      setNominatimPt({ lat: nLat, lng: nLng })
      setDistKm(dist)
      setState(dist <= GEO_THRESHOLD_KM ? 'ok' : 'warning')
    } catch { setState('notfound') }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-indigo-700">Verifica posizione con Nominatim</h3>
          <p className="text-[10px] text-indigo-400 mt-0.5">
            Confronta il marker dichiarato con le coordinate restituite da Nominatim per l'indirizzo inserito.
          </p>
        </div>
        {hasCoords && state !== 'loading' && (
          <button onClick={verify}
            className="shrink-0 ml-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition">
            {state === 'idle' ? 'Verifica indirizzo' : 'Riverifica'}
          </button>
        )}
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {!hasCoords && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠ Coordinate GPS non impostate — impossibile verificare la corrispondenza con l'indirizzo.
          </p>
        )}
        {hasCoords && state === 'loading' && (
          <p className="text-xs text-gray-400 animate-pulse">Ricerca in corso…</p>
        )}
        {hasCoords && state === 'idle' && (
          <p className="text-xs text-gray-400">Premi "Verifica indirizzo" per confrontare il marker con Nominatim.</p>
        )}

        {hasCoords && state === 'notfound' && (
          <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
            <span>⚠️</span>
            <span>Indirizzo non trovato su Nominatim. Impossibile verificare.</span>
          </div>
        )}

        {hasCoords && (state === 'ok' || state === 'warning') && nominatimPt && distKm != null && (
          <>
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium border
              ${state === 'ok'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'}`}>
              <span>{state === 'ok' ? '✅' : '⛔'}</span>
              <span>
                {state === 'ok'
                  ? `Coerente — il punto dista ${distKm.toFixed(2)} km dall'indirizzo dichiarato.`
                  : `Attenzione — il punto dista ${distKm.toFixed(2)} km dall'indirizzo dichiarato. Verificare se la via è corretta.`
                }
              </span>
            </div>

            <ReadOnlyMap
              lat={listing.location!.lat!}
              lng={listing.location!.lng!}
              nominatimLat={nominatimPt.lat}
              nominatimLng={nominatimPt.lng}
            />

            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" className="h-4" alt="" />
                Punto dichiarato
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500 shrink-0" />
                Nominatim suggerisce
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const ENERGY_COLOR: Record<string, string> = {
  A4: 'bg-green-700', A3: 'bg-green-600', A2: 'bg-green-500', A1: 'bg-lime-500',
  B: 'bg-yellow-400',  C: 'bg-yellow-500', D: 'bg-orange-400',
  E: 'bg-orange-500',  F: 'bg-red-500',    G: 'bg-red-700',   NA: 'bg-gray-300',
}

function fmtMoney(n?: number | null) {
  if (n == null) return '—'
  return `€ ${n.toLocaleString('it-IT')}`
}

function fmtDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('it-IT')
}

function bool(v?: boolean | null) { return v ? 'Sì' : 'No' }

// ─── ValidatedFieldRow (stesso pattern ProfileDetailPage) ─────────────────────

function ValidatedFieldRow({
  label, value, fieldName, validation, onApprove, onFlag, onReset, working,
}: {
  label: string; value: string; fieldName: string;
  validation?: ListingFieldValidation;
  onApprove: (f: string) => void;
  onFlag: (f: string, note: string) => void;
  onReset: (f: string) => void;
  working: string | null;
}) {
  const [showNote, setShowNote] = useState(false)
  const [note, setNote]         = useState('')
  const status = validation?.status

  const rowBg =
    status === 'APPROVED' ? 'bg-green-50' :
    status === 'FLAGGED'  ? 'bg-red-50'   : ''

  return (
    <div className={`py-2.5 border-b last:border-0 ${rowBg}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
          <p className="text-sm text-gray-800">{value || '—'}</p>
          {validation?.note && status === 'FLAGGED' && (
            <p className="text-xs text-red-600 mt-0.5">⚠ {validation.note}</p>
          )}
          {validation?.correctedAt && status === 'PENDING' && (
            <p className="text-xs text-blue-600 mt-0.5">✎ Corretto il {fmtDate(validation.correctedAt)}</p>
          )}
        </div>

        {/* Badge status */}
        <div className="shrink-0 flex items-center gap-1.5">
          {status === 'APPROVED' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              ✓ Approvato
            </span>
          )}
          {status === 'FLAGGED' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              ✗ Segnalato
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1.5">
        {status !== 'APPROVED' && (
          <button
            disabled={working === fieldName}
            onClick={() => onApprove(fieldName)}
            className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg
                       hover:bg-green-700 disabled:opacity-50 transition"
          >
            ✓ Approva
          </button>
        )}
        {status === 'APPROVED' && (
          <button
            disabled={working === fieldName}
            onClick={() => onReset(fieldName)}
            className="text-xs px-2.5 py-1 bg-gray-200 text-gray-600 rounded-lg
                       hover:bg-gray-300 disabled:opacity-50 transition"
          >
            Revoca
          </button>
        )}
        {status !== 'FLAGGED' && (
          <button
            onClick={() => setShowNote(s => !s)}
            className="text-xs px-2.5 py-1 border border-red-300 text-red-600 rounded-lg
                       hover:bg-red-50 transition"
          >
            ✗ Segnala
          </button>
        )}
      </div>

      {showNote && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Nota obbligatoria per il locatore..."
            className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <button
            disabled={!note.trim() || working === fieldName}
            onClick={() => { onFlag(fieldName, note); setShowNote(false); setNote('') }}
            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg
                       hover:bg-red-700 disabled:opacity-50 transition"
          >
            Invia
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const { id }            = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { state: locState } = useLocation()
  const backPath          = (locState as any)?.backTo ?? '/supervisor/listings'
  const [listing, setListing] = useState<ListingDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [recomputing, setRecomputing] = useState(false)
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    getSupervisorListing(id)
      .then(setListing)
      .catch(() => setError('Errore nel caricamento'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const getVal = (fieldName: string) =>
    listing?.validations.find(v => v.fieldName === fieldName)

  const approve = async (fieldName: string) => {
    if (!id) return
    setWorking(fieldName)
    try {
      const updated = await approveListingField(id, fieldName)
      setListing(prev => prev ? {
        ...prev,
        validations: prev.validations.map(v => v.fieldName === fieldName ? updated : v)
          .concat(prev.validations.find(v => v.fieldName === fieldName) ? [] : [updated])
      } : prev)
    } finally { setWorking(null) }
  }

  const flag = async (fieldName: string, note: string) => {
    if (!id) return
    setWorking(fieldName)
    try {
      const updated = await flagListingField(id, fieldName, note)
      setListing(prev => prev ? {
        ...prev,
        validations: prev.validations.some(v => v.fieldName === fieldName)
          ? prev.validations.map(v => v.fieldName === fieldName ? updated : v)
          : [...prev.validations, updated]
      } : prev)
    } finally { setWorking(null) }
  }

  const reset = async (fieldName: string) => {
    if (!id) return
    setWorking(fieldName)
    try {
      await resetListingField(id, fieldName)
      setListing(prev => prev ? {
        ...prev,
        validations: prev.validations.map(v =>
          v.fieldName === fieldName ? { ...v, status: 'PENDING', note: null } : v)
      } : prev)
    } finally { setWorking(null) }
  }

  const completeValidation = async () => {
    if (!id) return
    setCompleting(true)
    try {
      const res = await completeListingValidation(id)
      if (res.status === 'PUBLISHED') {
        navigate(backPath, { state: { published: true } })
      } else {
        navigate(backPath)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Errore durante la validazione')
    } finally {
      setCompleting(false)
    }
  }

  const handleRecompute = async () => {
    if (!id) return
    setRecomputing(true)
    try {
      await recomputeListingMatches(id)
      setRecomputeMsg('Match ricalcolati.')
      setTimeout(() => setRecomputeMsg(null), 4000)
    } catch {
      setRecomputeMsg('Errore nel ricalcolo.')
    } finally {
      setRecomputing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh] text-gray-400 text-sm">Caricamento...</div>
  if (!listing) return <div className="text-center py-12 text-red-500">{error ?? 'Annuncio non trovato'}</div>

  const row = (label: string, value: string, fieldName: string) => (
    <ValidatedFieldRow
      key={fieldName}
      label={label} value={value} fieldName={fieldName}
      validation={getVal(fieldName)}
      onApprove={approve} onFlag={flag} onReset={reset} working={working}
    />
  )

  const flaggedCount = listing.validations.filter(v => v.status === 'FLAGGED').length
  const approvedCount = listing.validations.filter(v => v.status === 'APPROVED').length

  return (
    <div className="w-full px-4 py-6">
      {/* Back */}
      <button onClick={() => navigate(backPath)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        ← Torna alla lista
      </button>

      {/* Title */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{listing.title ?? 'Senza titolo'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {listing.propertyType} · {listing.listingType}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-xs px-2 py-1 rounded-full font-medium
              ${listing.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                listing.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'}`}>
              {listing.status}
            </span>
            <div className="text-xs text-gray-400 mt-1">
              ✓ {approvedCount} · ✗ {flaggedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Foto — validazione per singola immagine */}
      {listing.media.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Foto</h3>
          </div>
          <div className="px-4 py-3 space-y-3">
            {listing.media.map(m => {
              const v = listing.validations.find(vv => vv.fieldName === `media.${m.id}`)
              const borderColor = v?.status === 'APPROVED' ? 'border-green-400' : v?.status === 'FLAGGED' ? 'border-red-400' : 'border-gray-200'
              return (
                <div key={m.id} className={`flex gap-3 items-start border-b last:border-0 pb-3 last:pb-0`}>
                  <img src={resolveMediaUrl(m.fileUrl)} alt=""
                    className={`h-20 w-20 object-cover rounded-lg shrink-0 border-2 ${borderColor}`} />
                  <div className="flex-1 min-w-0">
                    {m.isCover && <span className="text-[10px] text-blue-600 font-semibold uppercase">Copertina</span>}
                    <ValidatedFieldRow
                      label="Foto"
                      value={m.fileUrl.split('/').pop() ?? ''}
                      fieldName={`media.${m.id}`}
                      validation={v}
                      onApprove={approve} onFlag={flag} onReset={reset} working={working}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sections */}
      {[
        {
          title: 'Titolo e descrizione',
          fields: [
            row('Titolo (IT)', listing.title ?? '', 'title'),
            row('Descrizione (IT)', listing.description ?? '', 'description'),
            ...(listing.titleEn ? [
              <div key="title_en" className="py-2.5 border-b">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Titolo (EN) — traduzione automatica</span>
                <p className="text-sm text-gray-600 italic">{listing.titleEn}</p>
              </div>
            ] : []),
            ...(listing.descriptionEn ? [
              <div key="description_en" className="py-2.5 border-b last:border-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">Descrizione (EN) — traduzione automatica</span>
                <p className="text-sm text-gray-600 italic whitespace-pre-line">{listing.descriptionEn}</p>
              </div>
            ] : []),
          ]
        },
        {
          title: 'Posizione',
          fields: [
            <div key="location.coordinates" className="py-2.5 border-b">
              {listing.location?.lat && listing.location?.lng
                ? <ReadOnlyMap lat={listing.location.lat} lng={listing.location.lng} />
                : <p className="text-sm text-gray-400 italic">Posizione GPS non impostata</p>
              }

              <ValidatedFieldRow
                label="Posizione GPS (marker mappa)"
                value={listing.location?.lat
                  ? `${listing.location.lat.toFixed(5)}, ${listing.location.lng?.toFixed(5)}`
                  : '—'}
                fieldName="location.coordinates"
                validation={getVal('location.coordinates')}
                onApprove={approve} onFlag={flag} onReset={reset} working={working}
              />
            </div>,
            row('Indirizzo',
              listing.location?.fullAddress
                ?? [listing.location?.streetName, listing.location?.streetNumber].filter(Boolean).join(' ')
                ?? '',
              'location.fullAddress'),
            row('Comune', listing.location?.municipality ?? '', 'location.municipality'),
            row('CAP', listing.location?.postalCode ?? '', 'location.postalCode'),
            row('Provincia', listing.location?.province ?? '', 'location.province'),
            row('Precisione mostrata', listing.location?.locationPrecision ?? '', 'location.locationPrecision'),
            <div key="geocode-check" className="py-2.5">
              <GeocodeCheck listing={listing} />
            </div>,
          ]
        },
        {
          title: 'Prezzo',
          fields: [
            row('Canone mensile', fmtMoney(listing.price?.monthlyRent), 'price.monthlyRent'),
            row('Spese condominiali', fmtMoney(listing.price?.condominiumFees), 'price.condominiumFees'),
            row('Deposito', listing.price?.depositMonths ? `${listing.price.depositMonths} mesi` : fmtMoney(listing.price?.depositAmount), 'price.deposit'),
          ]
        },
        {
          title: 'Caratteristiche',
          fields: [
            row('Superficie', listing.features?.surfaceSqm ? `${listing.features.surfaceSqm} m²` : '—', 'features.surfaceSqm'),
            row('Locali', String(listing.features?.roomsCount ?? '—'), 'features.roomsCount'),
            row('Bagni', String(listing.features?.bathroomsCount ?? '—'), 'features.bathroomsCount'),
            row('Piano', listing.features?.floorNumber != null ? String(listing.features.floorNumber) : '—', 'features.floorNumber'),
          ]
        },
        {
          title: 'Disponibilità e regole',
          fields: [
            row('Stato disponibilità', listing.availability?.availabilityStatus ?? '', 'availability.availabilityStatus'),
            row('Disponibile dal', fmtDate(listing.availability?.availableFrom), 'availability.availableFrom'),
            row('Durata min. contratto', listing.availability?.minimumContractDurationMonths ? `${listing.availability.minimumContractDurationMonths} mesi` : '—', 'availability.minimumContractDurationMonths'),
            row('Animali ammessi', bool(listing.availability?.petsAllowed), 'availability.petsAllowed'),
            row('Fumatori ammessi', bool(listing.availability?.smokingAllowed), 'availability.smokingAllowed'),
          ]
        },
        {
          title: 'Efficienza energetica',
          fields: [
            <div key="energy" className="py-2.5 border-b">
              <div className="flex items-center gap-3">
                {listing.energy?.energyClass && (
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                    font-bold text-white ${ENERGY_COLOR[listing.energy.energyClass] ?? 'bg-gray-400'}`}>
                    {listing.energy.energyClass}
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Classe energetica</span>
                  <p className="text-sm text-gray-800">
                    {listing.energy?.energyClass ?? '—'} — EPgl: {listing.energy?.energyIndexEpgl ?? '—'} kWh/m²·a
                  </p>
                </div>
              </div>
            </div>,
            row('Certificato APE', bool(listing.energy?.energyCertificateAvailable), 'energy.energyCertificate'),
          ]
        },
        {
          title: 'Inserzionista',
          fields: [
            row('Nome display', listing.publisher?.displayName ?? '', 'publisher.displayName'),
            row('Tipo', listing.publisher?.publisherType ?? '', 'publisher.publisherType'),
            row('Contatto', listing.publisher?.contactPhone ?? listing.publisher?.contactEmail ?? '', 'publisher.contact'),
            ...(listing.publisherType === 'AGENCY' ? [
              row('Partita IVA', listing.publisher?.vatNumber ?? '', 'publisher.vatNumber'),
              row('REA', listing.publisher?.reaNumber ?? '', 'publisher.reaNumber'),
            ] : []),
          ]
        },
      ].map(section => (
        <div key={section.title} className="bg-white rounded-2xl border border-gray-200 mb-3 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
          </div>
          <div className="px-4">
            {section.fields}
          </div>
        </div>
      ))}

      {/* Complete validation button */}
      {(listing.status === 'IN_REVIEW' || listing.status === 'PUBLISHED' || listing.status === 'REJECTED') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-4">
          {flaggedCount > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              ⚠ Ci sono {flaggedCount} campi segnalati. La validazione rigetta l'annuncio.
            </p>
          )}
          {flaggedCount === 0 && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
              ✅ Nessun problema segnalato. La validazione pubblica l'annuncio.
            </p>
          )}
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button
            onClick={completeValidation}
            disabled={completing}
            className={`w-full py-3 text-sm font-bold rounded-xl transition
              ${flaggedCount === 0
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'}
              disabled:opacity-50`}
          >
            {completing ? 'Elaborazione...' :
              flaggedCount === 0 ? '✓ Pubblica annuncio' : '✗ Rigetta e notifica locatore'}
          </button>
        </div>
      )}

      {/* Ricalcola match — solo per annunci PUBLISHED */}
      {listing.status === 'PUBLISHED' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-3">
          <p className="text-xs text-gray-500 mb-2">
            Forza il ricalcolo dei match per questo annuncio. Utile se l'annuncio è stato pubblicato
            prima che alcuni tenant fossero verificati, o se i match sono mancanti.
          </p>
          {recomputeMsg && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mb-2">
              {recomputeMsg}
            </p>
          )}
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="w-full py-2 text-sm font-medium rounded-xl border border-indigo-300
                       text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition"
          >
            {recomputing ? 'Ricalcolo...' : '🔄 Ricalcola match tenant'}
          </button>
        </div>
      )}
    </div>
  )
}
