import L from 'leaflet'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { InterestAreaDto } from '@/types'
import 'leaflet/dist/leaflet.css'

// ─── Fit map to the bounding box of all provided geojson geometries ───────────

function FitToAllAreas({ areas }: { areas: InterestAreaDto[] }) {
  const map = useMap()
  useEffect(() => {
    const withGeo = areas.filter(a => a.areaGeojson)
    if (!withGeo.length) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const group  = L.featureGroup(withGeo.map(a => L.geoJSON(a.areaGeojson as any)))
      const bounds = group.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20], animate: false })
    } catch { /* ignore malformed geojson */ }
  }, [map, areas])
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AreaPreviewMapProps {
  areas: InterestAreaDto[]
}

export function AreaPreviewMap({ areas }: AreaPreviewMapProps) {
  const polygonAreas = areas.filter(a => a.areaGeojson)
  const anywhereArea = areas.find(a => a.areaType === 'ANYWHERE')

  // For ANYWHERE areas there is no polygon to preview — show a simple label card
  if (polygonAreas.length === 0 && anywhereArea) {
    return (
      <div className="w-full h-40 rounded-xl border bg-muted/30 flex flex-col items-center justify-center gap-2">
        <span className="text-2xl">🌍</span>
        <p className="text-sm font-medium text-foreground">{anywhereArea.cityName}</p>
        <p className="text-xs text-muted-foreground">Tutta la città</p>
      </div>
    )
  }

  if (polygonAreas.length === 0) return null

  return (
    // pointer-events-none makes the map truly non-navigable (visual only)
    <div className="w-full h-48 rounded-xl overflow-hidden border" style={{ pointerEvents: 'none' }}>
      <MapContainer
        center={[41.9, 12.5]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        keyboard={false}
        touchZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render all polygon areas */}
        {polygonAreas.map(area => (
          <GeoJSON
            key={area.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={area.areaGeojson as any}
            style={
              area.areaType === 'CITY_BOUNDARY'
                ? { color: '#6366f1', weight: 2, fillColor: '#6366f1', fillOpacity: 0.12, dashArray: '6 4' }
                : { color: '#6366f1', weight: 2.5, fillColor: '#6366f1', fillOpacity: 0.2 }
            }
          />
        ))}

        {/* Fit viewport to the combined bounds of all areas */}
        <FitToAllAreas areas={areas} />
      </MapContainer>
    </div>
  )
}
