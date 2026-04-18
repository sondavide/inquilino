import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { AgencyArea } from '@/types'
import { useLang } from '@/i18n'

const AREA_COLORS: Record<string, string> = {
  COMUNE:    '#3b82f6',
  PROVINCIA: '#f59e0b',
  REGIONE:   '#22c55e',
}

async function fetchPolygon(area: AgencyArea): Promise<object | null> {
  if (!area.osmId || !area.osmType) return null
  const prefix = area.osmType === 'relation' ? 'R' : area.osmType === 'way' ? 'W' : 'N'
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}${area.osmId}&format=json&polygon_geojson=1`,
      { headers: { 'Accept-Language': 'it' } }
    )
    const data = await res.json()
    return data[0]?.geojson ?? null
  } catch {
    return null
  }
}

interface AreaFeature { area: AgencyArea; geojson: object }

function FitBounds({ features }: { features: AreaFeature[] }) {
  const map = useMap()
  useEffect(() => {
    if (!features.length) return
    try {
      const group = L.geoJSON(features.map(f => f.geojson) as any)
      const bounds = group.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] })
    } catch { /* ignore invalid geometries */ }
  }, [features, map])
  return null
}

export default function AgencyAreaMap({ areas }: { areas: AgencyArea[] }) {
  const { t } = useLang()
  const [features, setFeatures] = useState<AreaFeature[]>([])
  const cacheRef = useRef<Record<string, object>>({})

  useEffect(() => {
    setFeatures(prev => prev.filter(f => areas.some(a => a.osmId === f.area.osmId)))

    const missing = areas.filter(a => a.osmId && a.osmType && !cacheRef.current[a.osmId!])
    if (!missing.length) return

    Promise.all(
      missing.map(async area => {
        const geojson = await fetchPolygon(area)
        if (geojson) cacheRef.current[area.osmId!] = geojson
        return geojson ? { area, geojson } : null
      })
    ).then(results => {
      const valid = results.filter(Boolean) as AreaFeature[]
      if (valid.length) {
        setFeatures(prev => {
          const ids = new Set(prev.map(f => f.area.osmId))
          return [...prev, ...valid.filter(f => !ids.has(f.area.osmId))]
        })
      }
    })
  }, [areas])

  if (!areas.length) {
    return (
      <div className="h-48 rounded-xl bg-muted/40 border flex items-center justify-center text-sm text-muted-foreground">
        {t('agency.areas.map_empty')}
      </div>
    )
  }

  return (
    <div className="h-64 rounded-xl overflow-hidden border">
      <MapContainer
        center={[42.5, 12.5]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {features.map(f => (
          <GeoJSON
            key={f.area.osmId}
            data={f.geojson as any}
            style={{
              color: AREA_COLORS[f.area.type] ?? '#6366f1',
              weight: 2,
              fillOpacity: 0.2,
              fillColor: AREA_COLORS[f.area.type] ?? '#6366f1',
            }}
          />
        ))}
        <FitBounds features={features} />
      </MapContainer>
    </div>
  )
}
