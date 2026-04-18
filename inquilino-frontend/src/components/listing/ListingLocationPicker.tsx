import { useState, useEffect, useCallback, useRef } from 'react'
import { useLang } from '../../i18n'
import { MapContainer, TileLayer, Marker, GeoJSON, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ListingLocationData, ListingFieldValidation, AgencyArea } from '../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from './FieldStatusBadge'

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_CENTER: [number, number] = [42.5, 12.5]
const DEFAULT_ZOOM = 6
const DETAIL_ZOOM  = 15

// ─── Nominatim polygon fetch ─────────────────────────────────────────────────

async function fetchAreaPolygon(area: AgencyArea): Promise<object | null> {
  if (!area.osmId || !area.osmType) return null
  const prefix = area.osmType === 'relation' ? 'R' : area.osmType === 'way' ? 'W' : 'N'
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}${area.osmId}&format=json&polygon_geojson=1`,
      { headers: { 'Accept-Language': 'it' } }
    )
    const data = await res.json()
    return data[0]?.geojson ?? null
  } catch { return null }
}

// ─── Point-in-polygon (ray-casting) ─────────────────────────────────────────
// GeoJSON coordinates are [lng, lat]

function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (((yi > lat) !== (yj > lat)) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

function pointInGeoJSON(lat: number, lng: number, geojson: any): boolean {
  if (!geojson) return false
  if (geojson.type === 'Polygon')
    return pointInRing(lat, lng, geojson.coordinates[0])
  if (geojson.type === 'MultiPolygon')
    return geojson.coordinates.some((poly: number[][][]) => pointInRing(lat, lng, poly[0]))
  return false
}

function isInsideAnyArea(lat: number, lng: number, geojsons: (object | null)[]): boolean {
  // If no polygon was loaded yet (still fetching), fall back to allowing the point
  if (!geojsons.length) return true
  return geojsons.some(g => g && pointInGeoJSON(lat, lng, g))
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface NominatimResult {
  display_name: string; lat: string; lon: string; place_id: string
  address: {
    road?: string; house_number?: string; city?: string; town?: string
    village?: string; municipality?: string; county?: string; state?: string
    postcode?: string
  }
}

interface Props {
  value: Partial<ListingLocationData>
  onChange: (loc: Partial<ListingLocationData>) => void
  validations?: ListingFieldValidation[]
  agencyAreas?: AgencyArea[]
}

// ─── Map sub-components ──────────────────────────────────────────────────────

function MapFlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 0.8 }) }, [lat, lng]) // eslint-disable-line
  return null
}

function MapFitGeoJSONs({ geojsons }: { geojsons: object[] }) {
  const map    = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || !geojsons.length) return
    try {
      const group  = L.geoJSON(geojsons as any)
      const bounds = group.getBounds()
      if (bounds.isValid()) { map.fitBounds(bounds, { padding: [24, 24] }); fitted.current = true }
    } catch { /* geojson malformato */ }
  }, [geojsons.length, map])
  return null
}

function DraggableMarker({ position, onMove }: {
  position: [number, number]; onMove: (lat: number, lng: number) => void
}) {
  const markerRef = useRef<L.Marker>(null)
  return (
    <Marker ref={markerRef} position={position} draggable
      eventHandlers={{ dragend: () => {
        const m = markerRef.current
        if (m) { const p = m.getLatLng(); onMove(p.lat, p.lng) }
      }}}
    />
  )
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function Field({ label, value, onChange, placeholder, required, fieldName, vs }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; fieldName?: string; vs?: ListingFieldValidation[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {fieldName && <FieldStatusBadge vs={vs} field={fieldName} />}
      </label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   ${fieldName ? fieldBorderClass(vs, fieldName) : ''}`}
      />
      {fieldName && <FieldNote vs={vs} field={fieldName} />}
    </div>
  )
}

function AreaToast({ message }: { message: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800">
      <span className="text-base leading-none shrink-0">⚠️</span>
      <span>{message}</span>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ListingLocationPicker({ value, onChange, validations: vs, agencyAreas }: Props) {
  const { t } = useLang()
  const [query, setQuery]        = useState('')
  const [suggestions, setSugg]   = useState<NominatimResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [gpsLoading, setGpsLoad] = useState(false)
  const [gpsError, setGpsError]  = useState<string | null>(null)
  const [areaToast, setAreaToast] = useState<string | null>(null)
  // Poligoni GeoJSON reali fetchati da Nominatim per le aree agenzia
  const [areaGeoJSONs, setAreaGeoJSONs] = useState<(object | null)[]>([])
  const debounceRef  = useRef<ReturnType<typeof setTimeout>>()
  const toastTimer   = useRef<ReturnType<typeof setTimeout>>()
  const geoCache     = useRef<Record<string, object>>({})

  const hasAgencyRestriction = !!(agencyAreas && agencyAreas.length > 0)
  const hasPosition          = !!(value.lat && value.lng)
  const loadedGeoJSONs       = areaGeoJSONs.filter(Boolean) as object[]

  // Fetch poligoni reali all'avvio (o quando cambiano le aree)
  useEffect(() => {
    if (!agencyAreas || !agencyAreas.length) { setAreaGeoJSONs([]); return }
    let cancelled = false
    Promise.all(
      agencyAreas.map(async area => {
        if (area.osmId && geoCache.current[area.osmId])
          return geoCache.current[area.osmId]
        const geojson = await fetchAreaPolygon(area)
        if (geojson && area.osmId) geoCache.current[area.osmId] = geojson
        return geojson
      })
    ).then(results => { if (!cancelled) setAreaGeoJSONs(results) })
    return () => { cancelled = true }
  }, [JSON.stringify(agencyAreas?.map(a => a.osmId))]) // eslint-disable-line

  const showToast = (msg: string) => {
    setAreaToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setAreaToast(null), 4000)
  }

  // ── GPS ──────────────────────────────────────────────────────────────────

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) return
    setGpsLoad(true); setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        if (hasAgencyRestriction && !isInsideAnyArea(lat, lng, areaGeoJSONs)) {
          showToast(t('loc.agencyArea.toast'))
          setGpsLoad(false)
          return
        }
        onChange({ ...value, lat, lng, displayLat: lat, displayLng: lng })
        setGpsLoad(false)
      },
      err => {
        setGpsLoad(false)
        if (err.code === err.PERMISSION_DENIED) setGpsError(t('loc.gpsError'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [onChange, value, hasAgencyRestriction, areaGeoJSONs]) // eslint-disable-line

  useEffect(() => { if (!hasPosition && !hasAgencyRestriction) requestGps() }, []) // eslint-disable-line

  // ── Ricerca Nominatim ────────────────────────────────────────────────────

  const searchNominatim = useCallback(async (q: string) => {
    if (q.length < 3) { setSugg([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=it&limit=5`,
        { headers: { 'Accept-Language': 'it' } }
      )
      setSugg(await res.json())
    } finally { setSearchLoading(false) }
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; setQuery(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchNominatim(v), 400)
  }

  const handleSuggestionPick = (r: NominatimResult) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    if (hasAgencyRestriction && !isInsideAnyArea(lat, lng, areaGeoJSONs)) {
      showToast(t('loc.agencyArea.outsideSearch'))
      setQuery(''); setSugg([])
      return
    }
    onChange({ ...value, lat, lng, displayLat: lat, displayLng: lng })
    setQuery(''); setSugg([])
  }

  const handleMapMove = (lat: number, lng: number) => {
    if (hasAgencyRestriction && !isInsideAnyArea(lat, lng, areaGeoJSONs)) {
      showToast(t('loc.agencyArea.toast'))
      return
    }
    onChange({ ...value, lat, lng, displayLat: lat, displayLng: lng })
  }

  const upd = (patch: Partial<ListingLocationData>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-5">

      {/* ── Sezione mappa ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          {t('loc.gpsLabel')} <span className="text-red-500">*</span>
          <FieldStatusBadge vs={vs} field="location.coordinates" />
        </p>
        <FieldNote vs={vs} field="location.coordinates" />
        <p className="text-xs text-gray-400 mb-2">{t('loc.gpsHint')}</p>

        {/* Barra ricerca + GPS */}
        <div className="relative mb-2">
          <div className="flex gap-2">
            <input type="text" value={query} onChange={handleQueryChange}
              placeholder={t('loc.searchPlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={requestGps} disabled={gpsLoading}
              title={t('loc.gpsButton')}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm
                         hover:bg-gray-200 disabled:opacity-50 transition">
              {gpsLoading ? '…' : '📍'}
            </button>
          </div>
          {gpsError && <p className="text-xs text-amber-600 mt-1">{gpsError}</p>}

          {suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-12 bg-white border border-gray-200
                            rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {suggestions.map(s => (
                <button key={s.place_id} type="button" onClick={() => handleSuggestionPick(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50
                             border-b border-gray-100 last:border-0">
                  {s.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {areaToast && <AreaToast message={areaToast} />}

        {/* Mappa */}
        <div className="rounded-xl overflow-hidden border border-gray-200 relative z-0">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM}
            style={{ height: 280, width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Poligoni reali delle aree agenzia */}
            {loadedGeoJSONs.map((geojson, i) => (
              <GeoJSON
                key={i}
                data={geojson as any}
                style={{ color: '#7c3aed', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.1, dashArray: '6 4' }}
              />
            ))}

            {hasPosition && (
              <>
                <DraggableMarker position={[value.lat!, value.lng!]} onMove={handleMapMove} />
                <MapFlyTo lat={value.lat!} lng={value.lng!} zoom={DETAIL_ZOOM} />
              </>
            )}
            <MapClickHandler onClick={handleMapMove} />

            {/* Fit della mappa sui poligoni agenzia (solo se non c'è già un punto) */}
            {hasAgencyRestriction && !hasPosition && loadedGeoJSONs.length > 0 && (
              <MapFitGeoJSONs geojsons={loadedGeoJSONs} />
            )}
          </MapContainer>
          <p className="text-xs text-gray-500 px-3 py-1.5 bg-gray-50">
            {hasPosition
              ? t('loc.mapHint', { lat: value.lat!.toFixed(5), lng: value.lng!.toFixed(5) })
              : t('loc.mapNoPos')}
          </p>
        </div>

        {/* Legenda aree agenzia */}
        {hasAgencyRestriction && (
          <p className="text-xs text-violet-700 mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-violet-500" />
            {t('loc.agencyArea.boundary')}: {agencyAreas!.map(a => a.displayName).join(', ')}
          </p>
        )}

        {/* Precisione posizione */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('loc.precision.label')}
          </label>
          <div className="flex gap-2">
            {[
              { v: 'EXACT',       l: t('loc.precision.EXACT'),       d: t('loc.precision.EXACT.desc') },
              { v: 'APPROXIMATE', l: t('loc.precision.APPROXIMATE'),  d: t('loc.precision.APPROXIMATE.desc') },
              { v: 'HIDDEN',      l: t('loc.precision.HIDDEN'),       d: t('loc.precision.HIDDEN.desc') },
            ].map(p => (
              <button key={p.v} type="button" onClick={() => upd({ locationPrecision: p.v as any })}
                title={p.d}
                className={`flex-1 py-2 text-xs rounded-lg border-2 font-medium transition
                  ${value.locationPrecision === p.v
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {p.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sezione indirizzo (manuale) ───────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">
          {t('loc.addressLabel')} <span className="text-xs font-normal text-gray-400">({t('loc.addressManual')})</span>
        </p>
        <p className="text-xs text-gray-400">{t('loc.addressHint')}</p>

        <Field
          label={t('loc.street')} required
          value={`${value.streetName ?? ''}${value.streetNumber ? ' ' + value.streetNumber : ''}`}
          onChange={v => {
            const parts = v.trim().match(/^(.*?)[\s,]+(\d+\w*)$/)
            if (parts) upd({ streetName: parts[1].trim(), streetNumber: parts[2], fullAddress: parts[1].trim() + ' ' + parts[2] })
            else upd({ streetName: v, streetNumber: undefined, fullAddress: v })
          }}
          placeholder={t('loc.streetPlaceholder')}
          fieldName="location.fullAddress" vs={vs}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('loc.municipality')} required
            value={value.municipality ?? ''} onChange={v => upd({ municipality: v })}
            placeholder={t('loc.municipalityPlaceholder')}
            fieldName="location.municipality" vs={vs}
          />
          <Field label={t('loc.postalCode')}
            value={value.postalCode ?? ''} onChange={v => upd({ postalCode: v })}
            placeholder={t('loc.postalCodePlaceholder')}
            fieldName="location.postalCode" vs={vs}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('loc.province')}
            value={value.province ?? ''} onChange={v => upd({ province: v })}
            placeholder={t('loc.provincePlaceholder')}
            fieldName="location.province" vs={vs}
          />
          <Field label={t('loc.district')}
            value={value.district ?? ''} onChange={v => upd({ district: v })}
            placeholder={t('loc.districtPlaceholder')}
          />
        </div>
      </div>
    </div>
  )
}
