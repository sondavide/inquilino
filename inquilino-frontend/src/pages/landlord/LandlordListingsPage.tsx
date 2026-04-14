import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getMyListings } from '../../api/listings'
import type { ListingSummary } from '../../types'
import { resolveMediaUrl } from '../../lib/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Bozza',       color: 'bg-gray-100 text-gray-600' },
  IN_REVIEW: { label: 'In revisione', color: 'bg-yellow-100 text-yellow-700' },
  PUBLISHED: { label: 'Pubblicato',   color: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Da correggere', color: 'bg-red-100 text-red-700' },
  ARCHIVED:  { label: 'Archiviato',   color: 'bg-gray-100 text-gray-400' },
  SUSPENDED: { label: 'Sospeso',      color: 'bg-orange-100 text-orange-700' },
}

const PROPERTY_LABELS: Record<string, string> = {
  APARTMENT: 'Appartamento', STUDIO: 'Monolocale', LOFT: 'Loft',
  PENTHOUSE: 'Attico', HOUSE: 'Casa', VILLA: 'Villa',
  ROOM: 'Stanza', BED_IN_SHARED_ROOM: 'Posto letto', OTHER: 'Altro',
}

export default function LandlordListingsPage() {
  const navigate       = useNavigate()
  const location       = useLocation()
  const [listings, setListings] = useState<ListingSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [showSubmitted, setShowSubmitted] = useState(false)

  useEffect(() => {
    if ((location.state as any)?.submitted) setShowSubmitted(true)
    getMyListings()
      .then(setListings)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh] text-gray-400 text-sm">
      Caricamento annunci...
    </div>
  )

  return (
    <div className="px-4 py-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">I miei annunci</h1>
        <button
          onClick={() => navigate('/landlord/listings/new')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl
                     hover:bg-blue-700 transition"
        >
          + Nuovo annuncio
        </button>
      </div>

      {/* Success message */}
      {showSubmitted && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          ✅ Annuncio inviato in revisione! Riceverai una notifica quando sarà pubblicato.
          <button onClick={() => setShowSubmitted(false)} className="ml-3 text-green-600 hover:underline text-xs">
            Chiudi
          </button>
        </div>
      )}

      {/* Empty state */}
      {listings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🏠</div>
          <p className="font-medium text-gray-600">Nessun annuncio ancora</p>
          <p className="text-sm mt-1">Inizia pubblicando il tuo primo immobile</p>
          <button
            onClick={() => navigate('/landlord/listings/new')}
            className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition"
          >
            Crea annuncio
          </button>
        </div>
      )}

      {/* Listing cards */}
      <div className="space-y-3">
        {listings.map(l => {
          const st = STATUS_LABELS[l.status] ?? { label: l.status, color: 'bg-gray-100 text-gray-600' }
          return (
            <div
              key={l.id}
              onClick={() => navigate(`/landlord/listings/${l.id}/edit`)}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4
                         hover:border-blue-300 hover:shadow-sm transition cursor-pointer"
            >
              {/* Cover image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {l.coverImageUrl ? (
                  <img src={resolveMediaUrl(l.coverImageUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {l.title ?? 'Bozza senza titolo'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {PROPERTY_LABELS[l.propertyType] ?? l.propertyType}
                  {l.municipality ? ` · ${l.municipality}` : ''}
                  {l.district ? `, ${l.district}` : ''}
                </p>
                {l.monthlyRent && (
                  <p className="text-sm font-bold text-blue-700 mt-1">
                    € {l.monthlyRent.toLocaleString('it-IT')}/mese
                    {l.surfaceSqm ? ` · ${l.surfaceSqm} m²` : ''}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span>📸 {l.mediaCount} foto</span>
                  {l.flaggedFieldsCount > 0 && (
                    <span className="text-red-500 font-medium">⚠ {l.flaggedFieldsCount} da correggere</span>
                  )}
                </div>
                {l.status === 'PUBLISHED' && (
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/landlord/listings/${l.id}/matches`) }}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700
                               text-white text-xs font-semibold rounded-xl transition"
                  >
                    👥 Vedi profili compatibili
                    {l.mutualMatchCount > 0 && (
                      <span className="bg-white text-blue-700 font-bold text-xs px-1.5 py-0.5 rounded-full leading-none">
                        💚 {l.mutualMatchCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
