import L from 'leaflet'
import {
  MapContainer, TileLayer, Polyline, Polygon, CircleMarker, GeoJSON,
  useMapEvents, useMap,
} from 'react-leaflet'
import {
  useState, useCallback, useEffect, useRef,
  type MutableRefObject,
} from 'react'
import { useLang } from '@/i18n'
import type { InterestArea } from '@/types'
import 'leaflet/dist/leaflet.css'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CityInfo {
  name: string
  lat:  number
  lng:  number
}

interface LocalArea {
  id:       string
  areaType: 'CITY_BOUNDARY' | 'POLYGON' | 'ANYWHERE'
  cityName: string
  geojson:  object | null
}

interface MapSelectorProps {
  /** Called when the user saves their areas. */
  onConfirm:         (message: string, areas: InterestArea[]) => void
  disabled?:         boolean
  /** Onboarding: pre-populate city from the resident address. */
  residenceAddress?: string
  /** Profile editing: start from the already-saved areas. */
  initialAreas?:     Array<{ areaType: string; cityName: string; areaGeojson: object | null }>
  /** Skip the opener button and go directly to the fullscreen editor. */
  defaultOpen?:      boolean
  /** Called when the editor is closed without saving (back button). */
  onClose?:          () => void
}

// ─── Nominatim helpers ─────────────────────────────────────────────────────────

async function geocodeCity(query: string): Promise<CityInfo | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=it&limit=1&addressdetails=1`
  try {
    const data = await fetch(url, { headers: { 'Accept-Language': 'it' } }).then(r => r.json())
    if (!data.length) return null
    const r    = data[0]
    const addr = r.address ?? {}
    const name = addr.city ?? addr.town ?? addr.village ?? addr.municipality
                 ?? r.display_name.split(',')[0].trim()
    return { name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
  } catch { return null }
}

async function fetchCityBoundary(lat: number, lng: number): Promise<object | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=12&polygon_geojson=1`
  try {
    const r = await fetch(url, { headers: { 'Accept-Language': 'it' } }).then(res => res.json())
    const g = r.geojson as { type?: string } | undefined
    if (g?.type === 'Polygon' || g?.type === 'MultiPolygon') return g as object
    return null
  } catch { return null }
}

/** Fit the Leaflet map to the bounding box of all provided areas. */
function fitToAreas(map: L.Map, areas: LocalArea[]) {
  const withGeo = areas.filter(a => a.geojson)
  if (!withGeo.length) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group  = L.featureGroup(withGeo.map(a => L.geoJSON(a.geojson as any)))
    const bounds = group.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], animate: false })
  } catch { /* ignore malformed geojson */ }
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MapInstanceRef({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map; return () => { mapRef.current = null } }, [map, mapRef])
  useMapEvents({})
  return null
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 12, { animate: true }) }, [map, lat, lng])
  return null
}

/** Deselects any selected area when clicking empty map space. */
function MapClickDeselect({ onDeselect, skipRef }: {
  onDeselect: () => void
  skipRef:    MutableRefObject<boolean>
}) {
  useMapEvents({ click: () => { if (!skipRef.current) onDeselect() } })
  return null
}

/** Re-invalidates map size whenever the trigger value changes (fixes stale getCenter after layout shifts). */
function MapInvalidateSize({ trigger }: { trigger: number }) {
  const map = useMap()
  useEffect(() => { requestAnimationFrame(() => map.invalidateSize()) }, [map, trigger])
  return null
}

// ─── Local ID counter ──────────────────────────────────────────────────────────

let _counter = 0
const newId = () => `la-${++_counter}`

// ─── Main component ────────────────────────────────────────────────────────────

export function MapSelector({
  onConfirm, disabled, residenceAddress, initialAreas, defaultOpen, onClose,
}: MapSelectorProps) {
  const { t } = useLang()
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false)

  // Committed areas
  const [areas,      setAreas]      = useState<LocalArea[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // City for map navigation (last selected city)
  const [city,        setCity]        = useState<CityInfo | null>(null)
  const [cityLoading, setCityLoading] = useState(false)

  // City search UI
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<Array<{
    place_id:     number
    display_name: string
    lat:          string
    lon:          string
    address:      Record<string, string>
  }>>([])
  const [searching, setSearching] = useState(false)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastReqRef   = useRef(0)

  // Draw mode
  const [drawing,    setDrawing]    = useState(false)
  const [vertices,   setVertices]   = useState<[number, number][]>([])
  const [drawClosed, setDrawClosed] = useState(false)

  const mapRef          = useRef<L.Map | null>(null)
  const initializedRef  = useRef(false)
  const polygonClickRef = useRef(false)  // prevents map click from deselecting after polygon click

  // ── Initialize on open ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || initializedRef.current) return
    initializedRef.current = true

    // Profile editing: load saved areas and fit map to their bounds
    if (initialAreas && initialAreas.length > 0) {
      const loaded = initialAreas.map(a => ({
        id:       newId(),
        areaType: a.areaType as LocalArea['areaType'],
        cityName: a.cityName,
        geojson:  a.areaGeojson,
      }))
      setAreas(loaded)
      // Leaflet may not have laid out yet — use rAF to ensure dimensions are known
      requestAnimationFrame(() => {
        if (mapRef.current) fitToAreas(mapRef.current, loaded)
      })
      return
    }

    // Onboarding: auto-populate the city from the residence address
    if (!residenceAddress) return
    setCityLoading(true)
    geocodeCity(residenceAddress).then(async c => {
      if (!c) { setCityLoading(false); return }
      setCity(c)
      const geojson = await fetchCityBoundary(c.lat, c.lng)
      setAreas([{
        id:       newId(),
        areaType: geojson ? 'CITY_BOUNDARY' : 'ANYWHERE',
        cityName: c.name,
        geojson,
      }])
      setCityLoading(false)
    })
  }, [isOpen, initialAreas, residenceAddress])

  // ── City search ─────────────────────────────────────────────────────────────

  const searchCity = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const reqId = ++lastReqRef.current
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=it&limit=5&addressdetails=1`
    fetch(url, { headers: { 'Accept-Language': 'it' } })
      .then(r => r.json())
      .then(data => {
        if (reqId !== lastReqRef.current) return
        setResults(data.filter((r: Record<string, unknown>) => {
          const a = r.address as Record<string, string> ?? {}
          return a.city || a.town || a.municipality
        }))
      })
      .catch(() => setResults([]))
      .finally(() => { if (reqId === lastReqRef.current) setSearching(false) })
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCity(val), 380)
  }

  /**
   * Selecting a city starts the process over:
   * all existing areas are replaced by the city boundary ("il processo ricomincia").
   */
  const selectCity = async (r: typeof results[number]) => {
    const addr = r.address ?? {}
    const name = addr.city ?? addr.town ?? addr.municipality ?? r.display_name.split(',')[0].trim()
    setQuery('')
    setResults([])
    setDrawing(false)
    setVertices([])
    setDrawClosed(false)
    setSelectedId(null)
    const info: CityInfo = { name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
    setCity(info)
    setCityLoading(true)
    const geojson = await fetchCityBoundary(info.lat, info.lng)
    setAreas([{
      id:       newId(),
      areaType: geojson ? 'CITY_BOUNDARY' : 'ANYWHERE',
      cityName: name,
      geojson,
    }])
    setCityLoading(false)
  }

  // ── Draw mode ───────────────────────────────────────────────────────────────

  const addVertex = () => {
    if (drawClosed || !mapRef.current) return
    const c = mapRef.current.getCenter()
    setVertices(prev => [...prev, [c.lat, c.lng]])
  }

  const closePolygon = () => {
    if (vertices.length >= 3) setDrawClosed(true)
  }

  const confirmPolygon = () => {
    if (!drawClosed || vertices.length < 3) return
    const cityName = city?.name ?? areas[0]?.cityName ?? ''
    // GeoJSON coordinates are [lng, lat]; close the ring by repeating the first point
    const ring = [
      ...vertices.map(([lat, lng]) => [lng, lat]),
      [vertices[0][1], vertices[0][0]],
    ]
    setAreas(prev => [
      // Remove city boundary — the drawn polygon replaces it
      ...prev.filter(a => a.areaType !== 'CITY_BOUNDARY'),
      { id: newId(), areaType: 'POLYGON', cityName, geojson: { type: 'Polygon', coordinates: [ring] } },
    ])
    setDrawing(false)
    setVertices([])
    setDrawClosed(false)
  }

  const cancelDraw = () => {
    setDrawing(false)
    setVertices([])
    setDrawClosed(false)
  }

  // ── Delete selected area ────────────────────────────────────────────────────

  const deleteSelected = () => {
    setAreas(prev => prev.filter(a => a.id !== selectedId))
    setSelectedId(null)
  }

  // ── Save / confirm ──────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (disabled || areas.length === 0) return
    const hasCustom   = areas.some(a => a.areaType === 'POLYGON')
    const primaryCity = areas[0]?.cityName ?? ''
    const message = hasCustom
      ? t('map.message.area',     { city: primaryCity })
      : t('map.message.anywhere', { city: primaryCity })
    const payload: InterestArea[] = areas.map(a => ({
      areaType:    a.areaType,
      cityName:    a.cityName,
      areaGeojson: a.geojson,
    }))
    onConfirm(message, payload)
    setIsOpen(false)
    onClose?.()
  }

  // ── Closed: show opener button (used in onboarding embedded mode) ───────────

  if (!isOpen) {
    return (
      <div className="border-t bg-background px-4 py-3">
        <button
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10
                     border border-primary/30 text-primary font-medium text-sm
                     hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <span>🗺️</span> {t('map.open')}
        </button>
      </div>
    )
  }

  // ── Full-screen editor ──────────────────────────────────────────────────────

  const mapCenter: [number, number] = city ? [city.lat, city.lng] : [41.9, 12.5]
  const selectedArea = areas.find(a => a.id === selectedId)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <button
          onClick={() => { setIsOpen(false); onClose?.() }}
          className="text-muted-foreground hover:text-foreground w-9 h-9 flex items-center justify-center text-xl"
        >←</button>
        <span className="font-semibold text-sm">
          {cityLoading
            ? <span className="text-muted-foreground">{t('app.loading')}</span>
            : city ? city.name : t('map.open')
          }
        </span>
        <div className="w-9" />
      </div>

      {/* ── City search ── */}
      <div className="px-4 pt-2 pb-1 shrink-0 relative z-[1000]">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder={t('map.search.placeholder')}
            autoComplete="off"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm
                       outline-none focus:ring-2 focus:ring-ring pr-8"
          />
          {searching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                             rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </div>
        {results.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-gray-900 border
                          rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {results.map(r => {
              const addr   = r.address ?? {}
              const name   = addr.city ?? addr.town ?? addr.municipality ?? r.display_name.split(',')[0].trim()
              const region = r.display_name.split(',').slice(1, 3).join(',').trim()
              return (
                <button
                  key={r.place_id}
                  onClick={() => selectCity(r)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors
                             flex items-baseline gap-2"
                >
                  <span className="font-medium">{name}</span>
                  {region && <span className="text-muted-foreground text-xs truncate">{region}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {city && <MapRecenter lat={city.lat} lng={city.lng} />}
          <MapInstanceRef mapRef={mapRef} />
          <MapInvalidateSize trigger={areas.length} />
          <MapClickDeselect
            onDeselect={() => setSelectedId(null)}
            skipRef={polygonClickRef}
          />

          {/* Committed areas — each remounts when its selection state changes to update style */}
          {areas.map(area => area.geojson && (
            <GeoJSON
              key={`${area.id}-${area.id === selectedId ? 's' : 'n'}`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={area.geojson as any}
              style={
                area.id === selectedId
                  ? { color: '#ef4444', weight: 3, fillColor: '#ef4444', fillOpacity: 0.2 }
                  : area.areaType === 'CITY_BOUNDARY'
                    ? { color: '#6366f1', weight: 2, fillColor: '#6366f1', fillOpacity: 0.12, dashArray: '6 4' }
                    : { color: '#6366f1', weight: 2.5, fillColor: '#6366f1', fillOpacity: 0.25 }
              }
              eventHandlers={{
                click: () => {
                  // Prevent the MapClickDeselect from firing on this same event
                  polygonClickRef.current = true
                  setTimeout(() => { polygonClickRef.current = false }, 0)
                  setSelectedId(prev => prev === area.id ? null : area.id)
                  if (drawing) cancelDraw()
                },
              }}
            />
          ))}

          {/* In-progress polygon (draw mode) */}
          {drawing && vertices.length > 0 && (
            <>
              {vertices.map((v, i) => (
                <CircleMarker
                  key={i}
                  center={v}
                  radius={6}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
                />
              ))}
              {drawClosed
                ? <Polygon
                    positions={vertices}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2 }}
                  />
                : <Polyline
                    positions={vertices}
                    pathOptions={{ color: '#ef4444', dashArray: '6 4' }}
                  />
              }
            </>
          )}
        </MapContainer>

        {/* ── Selected-area delete toolbar ── */}
        {selectedId && selectedArea && (
          <div className="absolute top-2 left-2 right-2 z-[600] bg-background/95 backdrop-blur-sm
                          rounded-xl border shadow-lg px-4 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {selectedArea.areaType === 'CITY_BOUNDARY' ? t('map.area.city_boundary') : t('area.type.POLYGON')}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{selectedArea.cityName}</p>
            </div>
            <div className="flex gap-3 ml-3 shrink-0">
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-muted-foreground"
              >
                {t('map.area.cancel')}
              </button>
              <button
                onClick={deleteSelected}
                className="text-xs font-semibold text-destructive"
              >
                {t('map.area.delete')}
              </button>
            </div>
          </div>
        )}

        {/* ── Crosshair (draw mode, polygon not yet closed) ── */}
        {drawing && !drawClosed && (
          <div
            className="absolute pointer-events-none z-[500]"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg
              width="40" height="40"
              viewBox="-20 -20 40 40"
              style={{ overflow: 'visible' }}
              aria-hidden="true"
            >
              <line x1="-20" y1="0" x2="-6"  y2="0"  stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              <line x1="6"   y1="0" x2="20"  y2="0"  stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              <line x1="0" y1="-20" x2="0" y2="-6"   stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              <line x1="0" y1="6"   x2="0" y2="20"   stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              <circle cx="0" cy="0" r="2.5" fill="#ef4444" opacity="0.9" />
            </svg>
          </div>
        )}

        {/* ── Draw controls ── */}
        {drawing && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4 z-[500] pointer-events-none">
            {!drawClosed ? (
              <>
                <button
                  onClick={addVertex}
                  className="pointer-events-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground
                             text-sm font-medium shadow-lg active:scale-95 transition-transform"
                >
                  + {t('map.draw.add_point')}
                  {vertices.length > 0 && (
                    <span className="ml-1 opacity-70">({t('map.draw.points', { n: vertices.length })})</span>
                  )}
                </button>
                {vertices.length >= 3 && (
                  <button
                    onClick={closePolygon}
                    className="pointer-events-auto px-4 py-2 rounded-xl bg-emerald-600 text-white
                               text-sm font-medium shadow-lg active:scale-95 transition-transform"
                  >
                    {t('map.draw.close')}
                  </button>
                )}
                <button
                  onClick={cancelDraw}
                  aria-label="Annulla disegno"
                  className="pointer-events-auto px-2.5 py-2 rounded-xl bg-muted/90 text-muted-foreground
                             text-sm shadow-lg active:scale-95 transition-transform"
                >✕</button>
              </>
            ) : (
              <>
                <button
                  onClick={confirmPolygon}
                  className="pointer-events-auto px-4 py-2 rounded-xl bg-emerald-600 text-white
                             text-sm font-medium shadow-lg active:scale-95 transition-transform"
                >
                  {t('map.draw.confirm')}
                </button>
                <button
                  onClick={() => { setVertices([]); setDrawClosed(false) }}
                  className="pointer-events-auto px-4 py-2 rounded-xl bg-muted/90 text-muted-foreground
                             text-sm font-medium shadow-lg active:scale-95 transition-transform"
                >
                  {t('map.draw.reset')}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── "Start drawing" button (browse mode) ── */}
        {!drawing && !selectedId && (
          <div className="absolute bottom-3 right-3 z-[500]">
            <button
              onClick={() => { setDrawing(true); setSelectedId(null); setAreas(prev => prev.filter(a => a.areaType !== 'CITY_BOUNDARY')) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-background border shadow-lg
                         text-sm font-medium text-foreground hover:bg-accent active:scale-95 transition-all"
            >
              ✏️ {t('map.mode.draw')}
            </button>
          </div>
        )}

        {/* ── Draw hint (overlay, does not affect map height) ── */}
        {drawing && vertices.length === 0 && (
          <div className="absolute bottom-[70px] left-0 right-0 flex justify-center px-4 z-[499] pointer-events-none">
            <p className="text-sm text-muted-foreground bg-background/90 rounded-lg px-3 py-2 shadow-sm text-center">
              {t('map.draw.hint')}
            </p>
          </div>
        )}

        {/* ── "Search a city first" hint ── */}
        {areas.length === 0 && !drawing && !cityLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[499]">
            <p className="text-sm text-muted-foreground bg-background/90 rounded-lg px-4 py-3 shadow-sm text-center max-w-xs">
              {t('map.no_city')}
            </p>
          </div>
        )}
      </div>

      {/* ── Confirm bar ── */}
      <div className="shrink-0 border-t bg-background px-4 py-3">

        {/* Area badges — tap to select/deselect */}
        {areas.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {areas.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedId(prev => prev === a.id ? null : a.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors
                  ${a.id === selectedId
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                  }`}
              >
                {a.areaType === 'CITY_BOUNDARY' ? '🏙️' : '✏️'} {a.cityName}
                {a.id === selectedId && <span className="ml-1 opacity-60">{t('map.badge.hint')}</span>}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={areas.length === 0 || !!disabled}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                     hover:bg-primary/90 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {t('map.confirm')}
        </button>
      </div>
    </div>
  )
}
