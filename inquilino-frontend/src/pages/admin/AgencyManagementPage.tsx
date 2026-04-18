import { useEffect, useState, useRef } from 'react'
import { adminListAgencies, adminApproveAgency, adminRejectAgency, adminSuspendAgency, adminGetAgency, adminUpdateAgencyAreas } from '@/api/agency'
import type { AgencyProfileSummary, AgencyStatus, AgencyArea } from '@/types'
import AgencyAreaMap from '@/pages/agency/AgencyAreaMap'
import { useLang } from '@/i18n'

// ─── Nominatim area search ─────────────────────────────────────────────────────

interface NominatimResult {
  osm_id: string; osm_type: string; display_name: string; addresstype: string
  address: { city?: string; town?: string; village?: string; county?: string; state?: string }
  boundingbox: string[]
}

function mapAddressType(type: string): 'COMUNE' | 'PROVINCIA' | 'REGIONE' | null {
  if (['city', 'town', 'village', 'municipality'].includes(type)) return 'COMUNE'
  if (['county'].includes(type)) return 'PROVINCIA'
  if (['state'].includes(type)) return 'REGIONE'
  return null
}

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({ q: query, format: 'json', addressdetails: '1', limit: '8', countrycodes: 'it' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'it' } })
  return res.json()
}

function nominatimToArea(r: NominatimResult): AgencyArea | null {
  const type = mapAddressType(r.addresstype)
  if (!type) return null
  return {
    type,
    name: r.address.city || r.address.town || r.address.village || r.address.county || r.address.state || r.display_name,
    osmId: r.osm_id,
    osmType: r.osm_type,
    displayName: r.display_name.split(',')[0].trim(),
    boundingBox: r.boundingbox.map(Number),
  }
}

function AreaSearch({ onAdd }: { onAdd: (area: AgencyArea) => void }) {
  const { t } = useLang()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<AgencyArea[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = (v: string) => {
    setQuery(v)
    clearTimeout(timer.current)
    if (v.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const raw = await searchNominatim(v)
        setResults(raw.map(nominatimToArea).filter(Boolean) as AgencyArea[])
      } finally { setLoading(false) }
    }, 400)
  }

  return (
    <div className="relative">
      <input
        type="text" value={query} onChange={e => handleChange(e.target.value)}
        placeholder={t('agency.areas.search_placeholder')}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-background"
      />
      {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t('agency.areas.searching')}</div>}
      {results.length > 0 && (
        <ul className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => { onAdd(r); setQuery(''); setResults([]) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  r.type === 'COMUNE' ? 'bg-blue-100 text-blue-700'
                  : r.type === 'PROVINCIA' ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
                }`}>{t(`agency.areas.type.${r.type}` as any)}</span>
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Area editor panel (per agency row) ──────────────────────────────────────

function AgencyAreaEditor({ agencyId, onClose }: { agencyId: string; onClose: () => void }) {
  const { t } = useLang()
  const [areas, setAreas] = useState<AgencyArea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    adminGetAgency(agencyId)
      .then(p => setAreas(p.areas ?? []))
      .catch(() => setError(t('agency.areas.error_save')))
      .finally(() => setLoading(false))
  }, [agencyId])

  const addArea = (area: AgencyArea) => {
    if (areas.some(a => a.osmId === area.osmId)) return
    setAreas(prev => [...prev, area])
  }

  const removeArea = (idx: number) => setAreas(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      await adminUpdateAgencyAreas(agencyId, areas)
      setSuccess(t('agency.areas.saved'))
      setTimeout(() => { setSuccess(''); onClose() }, 1500)
    } catch { setError(t('agency.areas.error_save')) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-4 text-sm text-muted-foreground text-center">{t('agency.profile.loading')}</div>

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <h4 className="text-sm font-medium">{t('agency.areas.admin_title')}</h4>
      <p className="text-xs text-muted-foreground">{t('agency.areas.admin_desc')}</p>

      <AreaSearch onAdd={addArea} />

      <AgencyAreaMap areas={areas} />

      {areas.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">{t('agency.areas.empty')}</p>
      )}

      <ul className="space-y-1.5">
        {areas.map((a, i) => (
          <li key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5 text-sm">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
              a.type === 'COMUNE' ? 'bg-blue-100 text-blue-700'
              : a.type === 'PROVINCIA' ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
            }`}>{t(`agency.areas.type.${a.type}` as any)}</span>
            <span className="flex-1 truncate text-xs">{a.displayName}</span>
            <button type="button" onClick={() => removeArea(i)}
              className="text-muted-foreground hover:text-destructive transition-colors">✕</button>
          </li>
        ))}
      </ul>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 border rounded-xl text-xs hover:bg-muted/40 transition">
          {t('agency.admin.cancel')}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition">
          {saving ? t('agency.areas.saving') : t('agency.areas.save')}
        </button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AgencyManagementPage() {
  const { t } = useLang()
  const [agencies, setAgencies] = useState<AgencyProfileSummary[]>([])
  const [filter, setFilter]     = useState<AgencyStatus | ''>('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [actionNote, setActionNote] = useState('')
  const [noteFor, setNoteFor]   = useState<string | null>(null)
  const [noteAction, setNoteAction] = useState<'reject' | 'suspend' | null>(null)
  const [areasOpen, setAreasOpen] = useState<string | null>(null)

  const STATUS_LABEL: Record<AgencyStatus, string> = {
    PENDING_APPROVAL: t('agency.admin.status.PENDING_APPROVAL'),
    ACTIVE:           t('agency.admin.status.ACTIVE'),
    SUSPENDED:        t('agency.admin.status.SUSPENDED'),
  }

  const STATUS_COLOR: Record<AgencyStatus, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    ACTIVE:           'bg-emerald-100 text-emerald-700',
    SUSPENDED:        'bg-red-100 text-red-700',
  }

  useEffect(() => { fetchAgencies() }, [filter])

  const fetchAgencies = async () => {
    setLoading(true)
    try { setAgencies((await adminListAgencies(filter || undefined)).content) }
    catch { setError(t('agency.admin.error_load')) }
    finally { setLoading(false) }
  }

  const handleApprove = async (id: string) => {
    try {
      const updated = await adminApproveAgency(id)
      setAgencies(prev => prev.map(a => a.id === id ? { ...a, status: updated.status, approvedAt: updated.approvedAt } : a))
    } catch { setError(t('agency.admin.error_approve')) }
  }

  const openNoteModal = (id: string, action: 'reject' | 'suspend') => {
    setNoteFor(id); setNoteAction(action); setActionNote('')
  }

  const handleConfirmAction = async () => {
    if (!noteFor || !noteAction) return
    try {
      if (noteAction === 'reject') await adminRejectAgency(noteFor, actionNote)
      else await adminSuspendAgency(noteFor, actionNote)
      await fetchAgencies()
      setNoteFor(null); setNoteAction(null)
    } catch { setError(t('agency.admin.error_action')) }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('agency.admin.title')}</h1>
        <div className="flex gap-2">
          {(['', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED'] as const).map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-gray-200 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {s === '' ? t('agency.admin.filter_all') : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">{t('agency.admin.loading')}</div>
      )}

      {!loading && agencies.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p className="text-3xl mb-2">🏢</p>
          <p>{t('agency.admin.empty')}</p>
        </div>
      )}

      <ul className="space-y-3">
        {agencies.map(a => (
          <li key={a.id} className="bg-card border rounded-2xl px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{a.agencyName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{a.contactEmail}</p>
                {a.vatNumber && <p className="text-xs text-muted-foreground">{t('agency.admin.vat', { vat: a.vatNumber })}</p>}
                <p className="text-xs text-muted-foreground">
                  {t('agency.admin.registered_at', { date: new Date(a.createdAt).toLocaleDateString('it-IT') })}
                  {a.approvedAt && ` · ${t('agency.admin.approved_at', { date: new Date(a.approvedAt).toLocaleDateString('it-IT') })}`}
                </p>
                {a.statusNote && (
                  <p className="text-xs text-amber-700 mt-1">{t('agency.admin.note_field', { note: a.statusNote })}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {a.status !== 'ACTIVE' && (
                  <button onClick={() => handleApprove(a.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                    {t('agency.admin.approve')}
                  </button>
                )}
                {a.status === 'PENDING_APPROVAL' && (
                  <button onClick={() => openNoteModal(a.id, 'reject')}
                    className="px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-50 transition">
                    {t('agency.admin.reject')}
                  </button>
                )}
                {a.status === 'ACTIVE' && (
                  <button onClick={() => openNoteModal(a.id, 'suspend')}
                    className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition">
                    {t('agency.admin.suspend')}
                  </button>
                )}
                <button
                  onClick={() => setAreasOpen(prev => prev === a.id ? null : a.id)}
                  className="px-3 py-1.5 border border-violet-300 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-50 transition">
                  {t('agency.areas.title')}
                </button>
              </div>
            </div>

            {areasOpen === a.id && (
              <AgencyAreaEditor agencyId={a.id} onClose={() => setAreasOpen(null)} />
            )}
          </li>
        ))}
      </ul>

      {noteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold">
              {noteAction === 'reject' ? t('agency.admin.note_reject_title') : t('agency.admin.note_suspend_title')}
            </h3>
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.admin.note_label')}</label>
              <textarea
                value={actionNote} onChange={e => setActionNote(e.target.value)}
                placeholder={t('agency.admin.note_placeholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setNoteFor(null); setNoteAction(null) }}
                className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-muted/40 transition">
                {t('agency.admin.cancel')}
              </button>
              <button onClick={handleConfirmAction}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-medium transition ${
                  noteAction === 'reject' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {t('agency.admin.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
