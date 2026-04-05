import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang }       from '@/i18n'
import { tenantApi, type TenantUpdatePayload } from '@/api/tenant'
import { onboardingApi } from '@/api/onboarding'
import type { TenantProfileDto, DocumentDto, InterestAreaDto, InterestArea, ScoreLevel } from '@/types'
import { MapSelector }    from '@/components/map/MapSelector'
import { AreaPreviewMap } from '@/components/map/AreaPreviewMap'
import { UploadButton }  from '@/components/chat/UploadButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('it-IT')
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return `€ ${n.toLocaleString('it-IT')}`
}

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ label, value }: { label: string; value: ScoreLevel }) {
  const { t } = useLang()
  const color =
    value === 'HIGH'   ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    value === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                         'bg-red-100 text-red-700 border-red-200'
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${color}`}>
        {t(`score.${value}` as Parameters<typeof t>[0])}
      </span>
      <span className="text-[11px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b last:border-0">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, locked, editing, onEdit, onSave, onCancel, saving, children
}: {
  title: string
  locked?: boolean
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  children: React.ReactNode
}) {
  const { t } = useLang()
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {!editing && !locked && (
          <button
            onClick={onEdit}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('profile.edit')}
          </button>
        )}
        {!editing && locked && (
          <span className="text-[10px] text-muted-foreground">🔒 {t('profile.locked')}</span>
        )}
        {editing && (
          <div className="flex gap-3">
            <button onClick={onCancel} className="text-xs text-muted-foreground hover:underline">
              {t('profile.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  )
}

// ─── Text input ───────────────────────────────────────────────────────────────

function TextInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
      />
    </div>
  )
}

function DateInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
      />
    </div>
  )
}

function NumberInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
      />
    </div>
  )
}

function BoolInput({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

function SelectInput({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
      >
        <option value="">—</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ docs, onDelete, onAdd }: {
  docs: DocumentDto[]
  onDelete: (id: string) => void
  onAdd: (filename: string) => void
}) {
  const { t } = useLang()
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  const docLabel = (type: string) => {
    const key = `doc.type.${type}` as Parameters<typeof t>[0]
    return t(key)
  }

  const handlePreview = async (id: string) => {
    setPreviewingId(id)
    try {
      const token = localStorage.getItem('auth_token')
      const res   = await fetch(`/api/tenant/documents/${id}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch { /* ignore */ }
    finally { setPreviewingId(null) }
  }

  return (
    <div className="space-y-4">
      {docs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">{t('doc.add')}</p>
      )}
      {docs.map(doc => (
        <div key={doc.id} className="rounded-xl border bg-card p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">📄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{docLabel(doc.type)}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(doc.uploadedAt)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                doc.verified
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {doc.verified ? t('doc.verified') : t('doc.pending')}
              </span>
              <button
                onClick={() => handlePreview(doc.id)}
                disabled={previewingId === doc.id}
                className="text-[10px] text-primary underline disabled:opacity-50"
              >
                {previewingId === doc.id ? '…' : 'Visualizza'}
              </button>
            </div>
          </div>
          {!doc.verified && (
            <>
              {confirmId === doc.id ? (
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <span className="text-xs text-destructive">{t('doc.delete.confirm')}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground">
                      {t('profile.cancel')}
                    </button>
                    <button
                      onClick={() => { onDelete(doc.id); setConfirmId(null) }}
                      className="text-xs font-semibold text-destructive"
                    >
                      {t('doc.delete')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(doc.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
      ))}

      <div className="pt-2">
        <UploadButton expectedTypes={[]} onUploaded={onAdd} disabled={false} highlight={false} />
      </div>
    </div>
  )
}

// ─── Areas tab ────────────────────────────────────────────────────────────────

function AreasTab({ areas, onSaved }: {
  areas:   InterestAreaDto[]
  onSaved: () => void
}) {
  const { t } = useLang()
  const [editing, setEditing] = useState(false)

  const hasArea = areas.length > 0

  const handleConfirm = (_message: string, incomingAreas: InterestArea[]) => {
    onboardingApi.saveInterestAreas(incomingAreas)
      .then(() => { onSaved(); setEditing(false) })
      .catch(console.error)
  }

  // Fullscreen editor — renders over everything via MapSelector's fixed overlay
  if (editing) {
    return (
      <MapSelector
        onConfirm={handleConfirm}
        onClose={() => setEditing(false)}
        defaultOpen={true}
        disabled={false}
        initialAreas={areas}
      />
    )
  }

  return (
    <div className="space-y-4">
      {hasArea ? (
        <>
          {/* Static, non-interactive area preview */}
          <AreaPreviewMap areas={areas} />

          {/* Area summary badges */}
          <div className="flex flex-wrap gap-1.5 px-1">
            {areas.map(a => (
              <span key={a.id} className="text-[11px] px-2.5 py-1 rounded-full border font-medium bg-primary/10 text-primary border-primary/20">
                {a.areaType === 'CITY_BOUNDARY' ? '🏙️' : '✏️'} {a.cityName}
              </span>
            ))}
          </div>

          <button
            onClick={() => setEditing(true)}
            className="w-full py-3 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
          >
            {t('area.edit')}
          </button>
        </>
      ) : (
        /* No area — user must have one to be matchable */
        <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-6 flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">📍</span>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('area.none')}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 max-w-xs">
            Senza un'area di interesse non potrai essere abbinato a nessun appartamento.
          </p>
          <button
            onClick={() => setEditing(true)}
            className="mt-1 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Aggiungi area
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'documents' | 'areas'

export default function TenantProfilePage() {
  const { t }     = useLang()
  const navigate  = useNavigate()
  const [params]  = useSearchParams()

  const [data, setData]     = useState<TenantProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState<Tab>((params.get('tab') as Tab) || 'profile')

  // Edit states per section (personal, employment, housing, guarantor)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  // Draft state for editing
  const [draft, setDraft] = useState<TenantUpdatePayload>({})

  useEffect(() => {
    tenantApi.getProfile()
      .then(d => { setData(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Caricamento…
    </div>
  )
  if (!data) return null

  const locked = data.verificationStatus === 'VERIFIED'

  // ── Edit helpers ────────────────────────────────────────────────────────────

  const startEdit = (section: string, initial: TenantUpdatePayload) => {
    setDraft(initial)
    setEditSection(section)
  }

  const cancelEdit = () => {
    setEditSection(null)
    setDraft({})
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const updated = await tenantApi.updateProfile(draft)
      setData(updated)
      setEditSection(null)
      setDraft({})
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  // ── Document handlers ───────────────────────────────────────────────────────

  const handleDeleteDoc = async (id: string) => {
    try {
      await tenantApi.deleteDocument(id)
      setData(d => d ? { ...d, documents: d.documents.filter(doc => doc.id !== id) } : d)
    } catch { /* ignore */ }
  }

  const handleDocAdded = (_filename: string) => {
    // Refresh profile to get updated document list
    tenantApi.getProfile().then(setData).catch(console.error)
  }

  // ── Area saved / deleted ────────────────────────────────────────────────────

  const handleAreaSaved = () => {
    tenantApi.getProfile().then(setData).catch(console.error)
  }

  // ── Active toggle ───────────────────────────────────────────────────────────

  const handleToggleActive = async (active: boolean) => {
    try {
      await tenantApi.setActive(active)
      setData(d => d ? { ...d, active } : d)
    } catch { /* ignore */ }
  }

  const initials = data.fullName
    ? data.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : data.email.slice(0, 2).toUpperCase()

  const employmentOptions = [
    { value: 'EMPLOYEE',      label: t('profile.employmentType.EMPLOYEE') },
    { value: 'SELF_EMPLOYED', label: t('profile.employmentType.SELF_EMPLOYED') },
    { value: 'STUDENT',       label: t('profile.employmentType.STUDENT') },
    { value: 'RETIRED',       label: t('profile.employmentType.RETIRED') },
    { value: 'OTHER',         label: t('profile.employmentType.OTHER') },
  ]

  const verBadgeCfg =
    data.verificationStatus === 'VERIFIED' ? { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: t('home.status.verified') } :
    data.verificationStatus === 'PARTIAL'  ? { cls: 'bg-amber-100 text-amber-700 border-amber-200',       label: t('home.status.partial')  } :
                                             { cls: 'bg-slate-100 text-slate-500 border-slate-200',        label: t('home.status.none')     }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground transition-colors text-lg"
          aria-label="Torna indietro"
        >
          ←
        </button>
        <span className="text-base font-semibold text-foreground flex-1">{t('profile.title')}</span>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${verBadgeCfg.cls}`}>
          {verBadgeCfg.label}
        </span>
      </header>

      {/* ── Profile header card ── */}
      <div className="px-4 pt-5 pb-3 max-w-lg mx-auto w-full">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground truncate">{data.fullName || data.email}</p>
            <p className="text-xs text-muted-foreground truncate">{data.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{data.profileCompletion}%</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${data.profileCompletion}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Score row */}
        <div className="rounded-xl border bg-card px-4 py-4 mb-4">
          <div className="flex justify-around gap-2">
            <ScoreBadge label={t('score.rentSustainability')}  value={data.score.rentSustainability}  />
            <ScoreBadge label={t('score.incomeStability')}     value={data.score.incomeStability}     />
            <ScoreBadge label={t('score.documentReliability')} value={data.score.documentReliability} />
          </div>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => handleToggleActive(!data.active)}
          className="flex items-center gap-3 w-full rounded-xl border p-4 bg-card mb-5"
        >
          <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${data.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.active ? 'translate-x-5' : ''}`} />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-semibold">{t('home.active.label')}</span>
            <span className="text-xs text-muted-foreground">{data.active ? t('home.active.on') : t('home.active.off')}</span>
          </div>
        </button>

        {/* ── Tab bar ── */}
        <div className="flex rounded-xl border overflow-hidden bg-muted/20 mb-5">
          {(['profile', 'documents', 'areas'] as Tab[]).map(tabId => {
            const labels: Record<Tab, string> = {
              profile:   t('profile.section.personal').split(' ')[0],
              documents: t('profile.section.documents'),
              areas:     t('profile.section.areas').split(' ')[0],
            }
            return (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors
                  ${tab === tabId
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {labels[tabId]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 max-w-lg mx-auto w-full space-y-4">

        {/* ── PROFILE tab ── */}
        {tab === 'profile' && (
          <>
            {/* Personal info */}
            <Section
              title={t('profile.section.personal')}
              locked={locked}
              editing={editSection === 'personal'}
              onEdit={() => startEdit('personal', {
                fullName:   data.fullName   ?? '',
                birthDate:  data.birthDate  ?? '',
                birthPlace: data.birthPlace ?? '',
                residence:  data.residence  ?? '',
              })}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
            >
              {editSection === 'personal' ? (
                <>
                  <TextInput label={t('profile.fullName')}   value={String(draft.fullName   ?? '')} onChange={v => setDraft(d => ({ ...d, fullName: v }))} />
                  <DateInput label={t('profile.birthDate')}  value={String(draft.birthDate  ?? '')} onChange={v => setDraft(d => ({ ...d, birthDate: v }))} />
                  <TextInput label={t('profile.birthPlace')} value={String(draft.birthPlace ?? '')} onChange={v => setDraft(d => ({ ...d, birthPlace: v }))} />
                  <TextInput label={t('profile.residence')}  value={String(draft.residence  ?? '')} onChange={v => setDraft(d => ({ ...d, residence: v }))} />
                </>
              ) : (
                <>
                  <FieldRow label={t('profile.fullName')}   value={data.fullName   ?? ''} />
                  <FieldRow label={t('profile.birthDate')}  value={fmtDate(data.birthDate)} />
                  <FieldRow label={t('profile.birthPlace')} value={data.birthPlace ?? ''} />
                  <FieldRow label={t('profile.residence')}  value={data.residence  ?? ''} />
                  <FieldRow label={t('profile.fiscalCode')} value={data.fiscalCode ?? ''} />
                </>
              )}
            </Section>

            {/* Employment */}
            <Section
              title={t('profile.section.employment')}
              locked={locked}
              editing={editSection === 'employment'}
              onEdit={() => startEdit('employment', {
                employmentType:      data.employmentType      ?? '',
                monthlyIncome:       data.monthlyIncome       ?? undefined,
                contractType:        data.contractType        ?? '',
                employmentStartDate: data.employmentStartDate ?? '',
              })}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
            >
              {editSection === 'employment' ? (
                <>
                  <SelectInput
                    label={t('profile.employmentType')}
                    value={String(draft.employmentType ?? '')}
                    options={employmentOptions}
                    onChange={v => setDraft(d => ({ ...d, employmentType: v }))}
                  />
                  <NumberInput
                    label={t('profile.monthlyIncome')}
                    value={String(draft.monthlyIncome ?? '')}
                    onChange={v => setDraft(d => ({ ...d, monthlyIncome: v ? Number(v) : null }))}
                  />
                  <TextInput
                    label={t('profile.contractType')}
                    value={String(draft.contractType ?? '')}
                    onChange={v => setDraft(d => ({ ...d, contractType: v }))}
                  />
                  <DateInput
                    label={t('profile.employmentStart')}
                    value={String(draft.employmentStartDate ?? '')}
                    onChange={v => setDraft(d => ({ ...d, employmentStartDate: v }))}
                  />
                </>
              ) : (
                <>
                  <FieldRow label={t('profile.employmentType')} value={
                    data.employmentType
                      ? t(`profile.employmentType.${data.employmentType}` as Parameters<typeof t>[0])
                      : ''
                  } />
                  <FieldRow label={t('profile.monthlyIncome')}  value={fmtMoney(data.monthlyIncome)} />
                  <FieldRow label={t('profile.contractType')}   value={data.contractType ?? ''} />
                  <FieldRow label={t('profile.employmentStart')} value={fmtDate(data.employmentStartDate)} />
                </>
              )}
            </Section>

            {/* Housing preferences */}
            <Section
              title={t('profile.section.housing')}
              locked={false}
              editing={editSection === 'housing'}
              onEdit={() => startEdit('housing', {
                maxBudget:  data.maxBudget  ?? undefined,
                moveInDate: data.moveInDate ?? '',
                occupants:  data.occupants  ?? undefined,
                hasPets:    data.hasPets,
                smoker:     data.smoker,
              })}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
            >
              {editSection === 'housing' ? (
                <>
                  <NumberInput
                    label={t('profile.maxBudget')}
                    value={String(draft.maxBudget ?? '')}
                    onChange={v => setDraft(d => ({ ...d, maxBudget: v ? Number(v) : null }))}
                  />
                  <DateInput
                    label={t('profile.moveInDate')}
                    value={String(draft.moveInDate ?? '')}
                    onChange={v => setDraft(d => ({ ...d, moveInDate: v }))}
                  />
                  <NumberInput
                    label={t('profile.occupants')}
                    value={String(draft.occupants ?? '')}
                    onChange={v => setDraft(d => ({ ...d, occupants: v ? Number(v) : null }))}
                  />
                  <BoolInput label={t('profile.hasPets')} value={!!draft.hasPets} onChange={v => setDraft(d => ({ ...d, hasPets: v }))} />
                  <BoolInput label={t('profile.smoker')}  value={!!draft.smoker}  onChange={v => setDraft(d => ({ ...d, smoker: v }))} />
                </>
              ) : (
                <>
                  <FieldRow label={t('profile.maxBudget')}  value={fmtMoney(data.maxBudget)} />
                  <FieldRow label={t('profile.moveInDate')} value={fmtDate(data.moveInDate)} />
                  <FieldRow label={t('profile.occupants')}  value={data.occupants != null ? String(data.occupants) : ''} />
                  <FieldRow label={t('profile.hasPets')}    value={data.hasPets ? t('profile.yes') : t('profile.no')} />
                  <FieldRow label={t('profile.smoker')}     value={data.smoker   ? t('profile.yes') : t('profile.no')} />
                </>
              )}
            </Section>

            {/* Guarantor */}
            <Section
              title={t('profile.section.guarantor')}
              locked={locked}
              editing={editSection === 'guarantor'}
              onEdit={() => startEdit('guarantor', {
                hasGuarantor:   data.hasGuarantor,
                guarantorIncome: data.guarantorIncome ?? undefined,
              })}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
            >
              {editSection === 'guarantor' ? (
                <>
                  <BoolInput
                    label={t('profile.hasGuarantor')}
                    value={!!draft.hasGuarantor}
                    onChange={v => setDraft(d => ({ ...d, hasGuarantor: v }))}
                  />
                  {draft.hasGuarantor && (
                    <NumberInput
                      label={t('profile.guarantorIncome')}
                      value={String(draft.guarantorIncome ?? '')}
                      onChange={v => setDraft(d => ({ ...d, guarantorIncome: v ? Number(v) : null }))}
                    />
                  )}
                </>
              ) : (
                <>
                  <FieldRow label={t('profile.hasGuarantor')}  value={data.hasGuarantor ? t('profile.yes') : t('profile.no')} />
                  {data.hasGuarantor && (
                    <FieldRow label={t('profile.guarantorIncome')} value={fmtMoney(data.guarantorIncome)} />
                  )}
                </>
              )}
            </Section>
          </>
        )}

        {/* ── DOCUMENTS tab ── */}
        {tab === 'documents' && (
          <DocumentsTab
            docs={data.documents}
            onDelete={handleDeleteDoc}
            onAdd={handleDocAdded}
          />
        )}

        {/* ── AREAS tab ── */}
        {tab === 'areas' && (
          <AreasTab
            areas={data.interestAreas}
            onSaved={handleAreaSaved}
          />
        )}

      </div>
    </div>
  )
}
