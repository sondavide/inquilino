import { useState, useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import type L from 'leaflet'
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, GeoJSON, useMapEvents, useMap } from 'react-leaflet'
import { useLang } from '@/i18n'
import type { InterestArea } from '@/types'
import 'leaflet/dist/leaflet.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type MapMode = 'draw' | 'anywhere'

interface CityInfo {
  name:    string
  lat:     number
  lng:     number
  bbox:    [number, number, number, number] // south, west, north, east
  geojson: object | null  // OSM administrative boundary from Nominatim polygon_geojson
}

interface MapSelectorProps {
  onConfirm:         (message: string, area: InterestArea) => void
  disabled?:         boolean
  residenceAddress?: string
}

// ─── Helper: Nominatim geocode (address → city center) ───────────────────────
// Does NOT request polygon_geojson — an address result gives a Point/LineString,
// not the municipal boundary. The boundary is fetched separately below.

async function geocodeCity(query: string): Promise<CityInfo | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=it&limit=1&addressdetails=1`
  try {
    const data = await fetch(url, { headers: { 'Accept-Language': 'it' } }).then(r => r.json())
    if (!data.length) return null
    const r = data[0]
    const bb = r.boundingbox as [string, string, string, string]
    const addr = r.address ?? {}
    const name = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? r.display_name.split(',')[0].trim()
    return {
      name,
      lat:     parseFloat(r.lat),
      lng:     parseFloat(r.lon),
      bbox:    [parseFloat(bb[0]), parseFloat(bb[2]), parseFloat(bb[1]), parseFloat(bb[3])],
      geojson: null, // filled asynchronously by fetchCityBoundary
    }
  } catch {
    return null
  }
}

// ─── Helper: fetch municipal boundary polygon ─────────────────────────────────
// Uses Nominatim /reverse with zoom=12, which maps to admin_level=8 (comune) in Italy.
// This is more reliable than /search filtering because it uses the coordinates
// directly and zoom=12 unambiguously targets the municipality level.

async function fetchCityBoundary(lat: number, lng: number): Promise<object | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=12&polygon_geojson=1`
  try {
    const r = await fetch(url, { headers: { 'Accept-Language': 'it' } }).then(res => res.json())
    const g = r.geojson as { type?: string } | undefined
    if (g?.type === 'Polygon' || g?.type === 'MultiPolygon') return g as object
    return null
  } catch {
    return null
  }
}

// ─── Sub-component: captures Leaflet map instance into a ref ─────────────────

function MapInstanceRef({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map; return () => { mapRef.current = null } }, [map, mapRef])
  useMapEvents({}) // required to keep the hook active
  return null
}

// ─── Sub-component: recenter map when city changes ────────────────────────────

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 12, { animate: true })
  }, [map, lat, lng])
  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MapSelector({ onConfirm, disabled, residenceAddress }: MapSelectorProps) {
  const { t } = useLang()
  const [isOpen, setIsOpen] = useState(false)

  // City
  const [city,         setCity]         = useState<CityInfo | null>(null)
  const [cityLoading,  setCityLoading]  = useState(false)
  const [query,        setQuery]        = useState('')
  const [results,      setResults]      = useState<Array<{ place_id: number; display_name: string; lat: string; lon: string; address: Record<string,string>; boundingbox: string[]; geojson?: object }>>([])
  const [searching,    setSearching]    = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastReqRef  = useRef(0)

  // Mode
  const [mode, setMode] = useState<MapMode>('draw')

  // Draw mode
  const [vertices,  setVertices]  = useState<[number, number][]>([])
  const [isClosed,  setIsClosed]  = useState(false)
  const mapRef = useRef<L.Map | null>(null)  // direct ref to Leaflet map instance

  // ─── Load residence city when panel opens ────────────────────────────────

  useEffect(() => {
    if (!isOpen || city || !residenceAddress) return
    setCityLoading(true)
    geocodeCity(residenceAddress).then(async c => {
      if (c) {
        setCity(c)                                   // center map immediately
        const geojson = await fetchCityBoundary(c.lat, c.lng)
        if (geojson) setCity(prev => prev ? { ...prev, geojson } : prev)
      }
      setCityLoading(false)
    })
  }, [isOpen, residenceAddress, city])

  // ─── City search ─────────────────────────────────────────────────────────

  const searchCity = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const reqId = ++lastReqRef.current
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=it&limit=5&addressdetails=1&featuretype=city&polygon_geojson=1`
    fetch(url, { headers: { 'Accept-Language': 'it' } })
      .then(r => r.json())
      .then(data => {
        if (reqId !== lastReqRef.current) return
        setResults(data.filter((r: Record<string,unknown>) => {
          const a = r.address as Record<string,string> ?? {}
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

  const selectCity = (r: typeof results[number]) => {
    const addr = r.address ?? {}
    const name = addr.city ?? addr.town ?? addr.municipality ?? r.display_name.split(',')[0].trim()
    const bb = r.boundingbox
    const info: CityInfo = {
      name,
      lat:     parseFloat(r.lat),
      lng:     parseFloat(r.lon),
      bbox:    [parseFloat(bb[0]), parseFloat(bb[2]), parseFloat(bb[1]), parseFloat(bb[3])],
      geojson: null, // filled by fetchCityBoundary (rank-filtered, comunale level)
    }
    setCity(info)
    setVertices([])
    setIsClosed(false)
    setQuery('')
    setResults([])
    fetchCityBoundary(info.lat, info.lng).then(geojson => {
      if (geojson) setCity(prev => prev ? { ...prev, geojson } : prev)
    })
  }

  // ─── Draw mode ────────────────────────────────────────────────────────────

  const addVertex = () => {
    if (isClosed || !mapRef.current) return
    // Read directly from Leaflet — never stale unlike React state
    const c = mapRef.current.getCenter()
    setVertices(prev => [...prev, [c.lat, c.lng]])
  }

  const closePolygon = () => {
    if (vertices.length < 3) return
    setIsClosed(true)
  }

  const resetDraw = () => {
    setVertices([])
    setIsClosed(false)
  }

  // ─── Confirm ─────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (disabled || !city) return
    let message = ''
    let area: InterestArea

    if (mode === 'draw') {
      if (vertices.length < 3 || !isClosed) return
      message = t('map.message.area', { city: city.name })
      // Build a GeoJSON Polygon from the drawn vertices (close the ring)
      const ring = [...vertices.map(([lat, lng]) => [lng, lat]), [vertices[0][1], vertices[0][0]]]
      area = {
        areaType:    'POLYGON',
        cityName:    city.name,
        areaGeojson: { type: 'Polygon', coordinates: [ring] },
      }
    } else {
      message = t('map.message.anywhere', { city: city.name })
      area = { areaType: 'ANYWHERE', cityName: city.name, areaGeojson: null }
    }

    onConfirm(message, area)
    setIsOpen(false)
  }

  const canConfirm = city && !disabled && (
    (mode === 'draw'    && vertices.length >= 3 && isClosed) ||
    (mode === 'anywhere')
  )

  // ─── Closed: show opener button ───────────────────────────────────────────

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

  // ─── Open: full-screen overlay ────────────────────────────────────────────

  const mapCenter2: [number, number] = city ? [city.lat, city.lng] : [41.9, 12.5]

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground w-9 h-9 flex items-center justify-center text-xl"
        >
          ←
        </button>
        <span className="font-semibold text-sm">
          {city ? city.name : t('map.open')}
          {cityLoading && <span className="ml-2 text-xs text-muted-foreground">{t('app.loading')}</span>}
        </span>
        <div className="w-9" />
      </div>

      {/* City search */}
      <div className="px-4 pt-2 pb-1 shrink-0 relative z-10">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder={t('map.search.placeholder')}
            autoComplete="off"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none
                       focus:ring-2 focus:ring-ring pr-8"
          />
          {searching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </div>
        {results.length > 0 && (
          <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-gray-900 border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {results.map(r => {
              const addr = r.address ?? {}
              const name = addr.city ?? addr.town ?? addr.municipality ?? r.display_name.split(',')[0].trim()
              const region = r.display_name.split(',').slice(1, 3).join(',').trim()
              return (
                <button
                  key={r.place_id}
                  onClick={() => selectCity(r)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-baseline gap-2"
                >
                  <span className="font-medium">{name}</span>
                  {region && <span className="text-muted-foreground text-xs truncate">{region}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 px-4 pb-2 shrink-0">
        {(['draw', 'anywhere'] as MapMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); resetDraw() }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t(`map.mode.${m}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {/* Map — takes all remaining vertical space */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={mapCenter2}
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

          {/* City boundary — shown when city has a GeoJSON boundary and no user polygon is drawn */}
          {city?.geojson && !(mode === 'draw' && isClosed) && (
            <GeoJSON
              key={city.name}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={city.geojson as any}
              style={{ color: '#6366f1', weight: 2, fillColor: '#6366f1', fillOpacity: 0.08, dashArray: '6 4' }}
            />
          )}

          {/* Draw mode: vertices + lines */}
          {mode === 'draw' && vertices.length > 0 && (
            <>
              {vertices.map((v, i) => (
                <CircleMarker
                  key={i}
                  center={v}
                  radius={6}
                  pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 1 }}
                />
              ))}
              {isClosed
                ? <Polygon positions={vertices} pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.25 }} />
                : <Polyline positions={vertices} pathOptions={{ color: '#6366f1', dashArray: '6 4' }} />
              }
            </>
          )}
        </MapContainer>

        {/* Crosshair (draw mode only, when not closed) */}
        {mode === 'draw' && !isClosed && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[500]">
            {/* SVG crosshair: origin (0,0) of the svg is at map center pixel */}
            <svg
              width="40" height="40"
              viewBox="-20 -20 40 40"
              style={{ overflow: 'visible' }}
              aria-hidden="true"
            >
              {/* horizontal arm */}
              <line x1="-20" y1="0" x2="-6" y2="0" stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              <line x1="6"   y1="0" x2="20"  y2="0" stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              {/* vertical arm */}
              <line x1="0" y1="-20" x2="0" y2="-6" stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              <line x1="0" y1="6"   x2="0" y2="20" stroke="#ef4444" strokeWidth="1.5" opacity="0.85" />
              {/* center dot */}
              <circle cx="0" cy="0" r="2.5" fill="#ef4444" opacity="0.9" />
            </svg>
          </div>
        )}

        {/* Draw mode controls (overlay at bottom of map) */}
        {mode === 'draw' && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4 z-[500] pointer-events-none">
            {!isClosed ? (
              <>
                <button
                  onClick={addVertex}
                  className="pointer-events-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-lg active:scale-95 transition-transform"
                >
                  + {t('map.draw.add_point')}
                  {vertices.length > 0 && <span className="ml-1 opacity-70">({t('map.draw.points', { n: vertices.length })})</span>}
                </button>
                {vertices.length >= 3 && (
                  <button
                    onClick={closePolygon}
                    className="pointer-events-auto px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg active:scale-95 transition-transform"
                  >
                    {t('map.draw.close')}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={resetDraw}
                className="pointer-events-auto px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium shadow-lg active:scale-95 transition-transform"
              >
                {t('map.draw.reset')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Anywhere mode: description */}
      {mode === 'anywhere' && city && (
        <div className="shrink-0 border-t px-4 py-3 bg-background">
          <p className="text-sm text-muted-foreground">
            {t('map.message.anywhere', { city: city.name })}
          </p>
        </div>
      )}

      {/* Draw mode: hint when no vertices yet */}
      {mode === 'draw' && vertices.length === 0 && (
        <div className="shrink-0 border-t px-4 py-3 bg-background">
          <p className="text-sm text-muted-foreground">{t('map.draw.hint')}</p>
        </div>
      )}

      {/* Confirm bar */}
      <div className="shrink-0 border-t bg-background px-4 py-3">
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                     hover:bg-primary/90 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {t('map.confirm')}
        </button>
      </div>
    </div>
  )
}
