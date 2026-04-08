import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supervisorApi } from '@/api/supervisor'
import type { SupervisorProfileSummary, PagedResponse } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  PENDING_VALIDATION: 'In attesa',
  IN_VALIDATION:      'In revisione',
  NEEDS_CORRECTION:   'Da correggere',
  VERIFIED:           'Verificato',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_VALIDATION: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_VALIDATION:      'bg-blue-100 text-blue-700 border-blue-200',
  NEEDS_CORRECTION:   'bg-red-100 text-red-700 border-red-200',
  VERIFIED:           'bg-green-100 text-green-700 border-green-200',
}

const PAGE_SIZE = 20

const FILTERS = ['ALL', 'PENDING_VALIDATION', 'IN_VALIDATION', 'NEEDS_CORRECTION', 'VERIFIED'] as const
type Filter = typeof FILTERS[number]

const ALL_STATUSES = 'PENDING_VALIDATION,IN_VALIDATION,NEEDS_CORRECTION,VERIFIED'

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

export default function ProfileListPage() {
  const navigate = useNavigate()
  const [result, setResult]   = useState<PagedResponse<SupervisorProfileSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>('ALL')
  const [page, setPage]       = useState(0)

  const statuses = filter === 'ALL' ? ALL_STATUSES : filter

  useEffect(() => {
    setLoading(true)
    supervisorApi.listProfiles(statuses, page, PAGE_SIZE)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, page])

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    setPage(0)
  }

  const profiles   = result?.content ?? []
  const totalPages = result?.totalPages ?? 0
  const totalItems = result?.totalElements ?? 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-5">Profili</h1>

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
        <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
          Caricamento…
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nessun profilo in questa categoria
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            {totalItems} profili
            {totalPages > 1 && ` · pagina ${page + 1} di ${totalPages}`}
          </p>

          <div className="space-y-3">
            {profiles.map(p => (
              <div
                key={p.profileId}
                onClick={() => navigate(`/supervisor/profiles/${p.profileId}`)}
                className="rounded-xl border bg-card p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                  {(p.fullName || p.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {p.fullName || p.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                           style={{ width: `${p.profileCompletion}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{p.profileCompletion}%</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                  STATUS_COLOR[p.verificationStatus] ?? 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {STATUS_LABEL[p.verificationStatus] ?? p.verificationStatus}
                </span>
              </div>
            ))}
          </div>

          <Pagination current={page} total={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
