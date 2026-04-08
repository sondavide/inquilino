import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import type { AuditLogEntry } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  FIELD_APPROVED:              'Campo approvato',
  FIELD_FLAGGED:               'Campo segnalato',
  FIELD_CORRECTION_SUBMITTED:  'Correzione inviata',
  DOCUMENT_APPROVED:           'Documento approvato',
  DOCUMENT_FLAGGED:            'Documento segnalato',
  STATUS_CHANGED:              'Stato cambiato',
  INTEREST_AREA_MODIFIED:      'Aree interesse modificate',
  SUPERVISOR_CREATED:          'Supervisore creato',
}

const ACTION_COLOR: Record<string, string> = {
  FIELD_APPROVED:             'text-emerald-600',
  DOCUMENT_APPROVED:          'text-emerald-600',
  FIELD_FLAGGED:              'text-red-500',
  DOCUMENT_FLAGGED:           'text-red-500',
  FIELD_CORRECTION_SUBMITTED: 'text-blue-500',
  STATUS_CHANGED:             'text-amber-600',
  INTEREST_AREA_MODIFIED:     'text-purple-500',
  SUPERVISOR_CREATED:         'text-slate-500',
}

export default function AuditLogPage() {
  const [entries, setEntries]     = useState<AuditLogEntry[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const [loading, setLoading]     = useState(true)
  const [profileFilter, setProfileFilter] = useState('')
  const [profileInput, setProfileInput]   = useState('')

  const PAGE_SIZE = 50

  const loadData = (p: number, pf?: string) => {
    setLoading(true)
    adminApi.getAuditLog(pf || undefined, p, PAGE_SIZE)
      .then(data => {
        setEntries(data.content)
        setTotal(data.totalElements)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData(0) }, [])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const pf = profileInput.trim() || ''
    setProfileFilter(pf)
    setPage(0)
    loadData(0, pf)
  }

  const handlePage = (p: number) => {
    setPage(p)
    loadData(p, profileFilter)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-5">Audit Log</h1>

      {/* Filtro per profilo */}
      <form onSubmit={handleFilter} className="flex gap-2 mb-5">
        <input
          type="text"
          value={profileInput}
          onChange={e => setProfileInput(e.target.value)}
          placeholder="UUID del profilo tenant (opzionale)"
          className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Filtra
        </button>
        {profileFilter && (
          <button
            type="button"
            onClick={() => { setProfileInput(''); setProfileFilter(''); setPage(0); loadData(0) }}
            className="px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </form>

      {/* Stats */}
      <p className="text-xs text-muted-foreground mb-3">
        {total} eventi totali{profileFilter ? ` per profilo ${profileFilter}` : ''}
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Caricamento…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-12">Nessun evento</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {entries.map(e => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${ACTION_COLOR[e.action] ?? 'text-foreground'}`}>
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                      {e.fieldName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          {e.fieldName}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium
                        ${e.actorType === 'SUPERVISOR' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          e.actorType === 'SUPERADMIN' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                          'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {e.actorType}
                      </span>
                    </div>

                    {(e.oldValue || e.newValue) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.oldValue && <span className="line-through mr-1">{e.oldValue}</span>}
                        {e.newValue && <span className="text-foreground">{e.newValue}</span>}
                      </p>
                    )}
                    {e.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{e.note}"</p>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        Profilo: {e.tenantProfileId}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString('it-IT', {
                      day: '2-digit', month: 'short', year: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button
            onClick={() => handlePage(page - 1)}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40 hover:bg-muted/50 transition-colors"
          >
            Precedente
          </button>
          <span className="px-3 py-1.5 text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => handlePage(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40 hover:bg-muted/50 transition-colors"
          >
            Successiva
          </button>
        </div>
      )}
    </div>
  )
}
