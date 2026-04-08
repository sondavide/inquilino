import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupervisorListingQueue } from '../../api/listings'
import type { ListingSummary, PagedResponse } from '../../types'
import { resolveMediaUrl } from '../../lib/utils'

const STATUS_LABEL: Record<string, string> = {
  IN_REVIEW: 'In revisione',
  REJECTED:  'Da correggere',
  PUBLISHED: 'Pubblicato',
  DRAFT:     'Bozza',
  ARCHIVED:  'Archiviato',
  SUSPENDED: 'Sospeso',
}

const STATUS_COLOR: Record<string, string> = {
  IN_REVIEW: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  REJECTED:  'bg-red-100 text-red-700 border-red-200',
  PUBLISHED: 'bg-green-100 text-green-700 border-green-200',
  DRAFT:     'bg-gray-100 text-gray-600 border-gray-200',
  ARCHIVED:  'bg-slate-100 text-slate-500 border-slate-200',
  SUSPENDED: 'bg-orange-100 text-orange-700 border-orange-200',
}

const PROPERTY_LABELS: Record<string, string> = {
  APARTMENT: 'Appartamento', STUDIO: 'Monolocale', LOFT: 'Loft',
  PENTHOUSE: 'Attico', HOUSE: 'Casa', VILLA: 'Villa',
  ROOM: 'Stanza', BED_IN_SHARED_ROOM: 'Posto letto',
}

const PAGE_SIZE = 20
const ALL_STATUSES = 'IN_REVIEW,REJECTED,PUBLISHED'

const FILTERS = ['ALL', 'IN_REVIEW', 'REJECTED', 'PUBLISHED'] as const
type Filter = typeof FILTERS[number]

function Pagination({ current, total, onChange }: {
  current: number; total: number; onChange: (p: number) => void
}) {
  if (total <= 1) return null

  const pages: (number | '…')[] = []
  if (total <= 7) {
    for (let i = 0; i < total; i++) pages.push(i)
  } else {
    pages.push(0)
    if (current > 2) pages.push('…')
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i)
    if (current < total - 3) pages.push('…')
    pages.push(total - 1)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-5">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 0}
        className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground
                   hover:text-foreground disabled:opacity-30 transition"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition
              ${p === current
                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            {(p as number) + 1}
          </button>
        )
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total - 1}
        className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground
                   hover:text-foreground disabled:opacity-30 transition"
      >
        ›
      </button>
    </div>
  )
}

export default function ListingListPage() {
  const navigate = useNavigate()
  const [result, setResult]   = useState<PagedResponse<ListingSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>('ALL')
  const [page, setPage]       = useState(0)

  const statuses = filter === 'ALL' ? ALL_STATUSES : filter

  useEffect(() => {
    setLoading(true)
    getSupervisorListingQueue(statuses, page, PAGE_SIZE)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, page])

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    setPage(0)
  }

  const listings  = result?.content ?? []
  const totalPages = result?.totalPages ?? 0
  const totalItems = result?.totalElements ?? 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-5">Annunci</h1>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(s => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${filter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-muted text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
          >
            {s === 'ALL' ? 'Tutti' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Caricamento…
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nessun annuncio in questa categoria
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            {totalItems} annunci
            {totalPages > 1 && ` · pagina ${page + 1} di ${totalPages}`}
          </p>

          <div className="space-y-3">
            {listings.map(l => (
              <div
                key={l.id}
                onClick={() => navigate(`/supervisor/listings/${l.id}`)}
                className="bg-card rounded-xl border p-4 flex gap-4
                           hover:bg-muted/20 transition-colors cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                  {l.coverImageUrl
                    ? <img src={resolveMediaUrl(l.coverImageUrl)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{l.title ?? 'Senza titolo'}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      STATUS_COLOR[l.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {PROPERTY_LABELS[l.propertyType] ?? l.propertyType}
                    {l.municipality ? ` · ${l.municipality}` : ''}
                  </p>
                  {l.monthlyRent && (
                    <p className="text-sm text-blue-700 mt-1">€ {l.monthlyRent.toLocaleString('it-IT')}/mese</p>
                  )}
                  {l.flaggedFieldsCount > 0 && (
                    <p className="text-xs text-red-500 mt-1">⚠ {l.flaggedFieldsCount} campi segnalati</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination current={page} total={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
