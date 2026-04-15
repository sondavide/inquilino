import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang }       from '@/i18n'
import { tenantApi, type TenantUpdatePayload } from '@/api/tenant'
import { onboardingApi } from '@/api/onboarding'
import type { TenantProfileDto, DocumentDto, InterestAreaDto, InterestArea, ScoreLevel, FieldValidationDto, GuarantorDto, GuarantorRequest, SupervisorNoteDto } from '@/types'
import { MapSelector }    from '@/components/map/MapSelector'
import { AreaPreviewMap } from '@/components/map/AreaPreviewMap'
import { UploadButton }  from '@/components/chat/UploadButton'
import { TenantScoreBreakdownPanel } from '@/components/supervisor/ScoreBreakdownPanel'

const DocumentViewerModal = lazy(() =>
  import('@/components/documents/DocumentViewerModal').then(m => ({ default: m.DocumentViewerModal }))
)

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

// ─── Editable field row ───────────────────────────────────────────────────────

function EditableFieldRow({
  label,
  displayValue,
  validation,
  type = 'text',
  options,
  rawValue,
  lockWhenApproved = true,
  warning,
  onSave,
}: {
  label:             string
  displayValue:      string
  validation?:       FieldValidationDto
  type?:             'text' | 'date' | 'number' | 'bool' | 'select'
  options?:          { value: string; label: string }[]
  rawValue?:         string | number | boolean | null
  /** If true (default), APPROVED fields are locked and cannot be edited. */
  lockWhenApproved?: boolean
  /** If set, clicking the pencil shows this warning before opening the input. */
  warning?:          string
  onSave:            (val: string | number | boolean | null) => Promise<void>
}) {
  const [editing,    setEditing]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving,     setSaving]     = useState(false)

  // Ref to the DOM input/select — always holds the latest typed value
  const fieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  const approved = validation?.status === 'APPROVED'
  const flagged  = validation?.status === 'FLAGGED'
  const pending  = validation?.status === 'PENDING'
  const locked   = lockWhenApproved && approved

  const bg =
    flagged  ? 'bg-red-100 dark:bg-red-900/30 rounded-lg px-2 -mx-2 my-0.5' :
    approved ? 'bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-2 -mx-2' :
    pending  ? 'bg-amber-50 dark:bg-amber-950/20 rounded-lg px-2 -mx-2' : ''

  const startEdit = () => setEditing(true)

  const handlePencilClick = () => {
    if (warning) setConfirming(true)
    else startEdit()
  }

  const handleSave = async () => {
    // Read directly from the DOM — immune to stale React state
    const raw = fieldRef.current?.value ?? ''
    setSaving(true)
    try {
      let val: string | number | null = raw
      if (type === 'number') val = raw !== '' ? Number(raw) : null
      await onSave(val)
      setEditing(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  // ── Boolean: toggle with optional warning ────────────────────────────────

  if (type === 'bool') {
    return (
      <div className={`flex flex-col gap-1 py-2 border-b last:border-0 ${bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
              {approved && <span className="text-[9px] font-bold text-emerald-600 ml-1">✓</span>}
              {pending  && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 ml-1">In attesa</span>}
              {flagged  && <span className="text-[10px] font-bold text-white bg-red-500 rounded px-1.5 py-0.5 ml-1">Da correggere</span>}
            </div>
            {flagged && validation?.note && (
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mt-0.5">{validation.note}</p>
            )}
          </div>
          {locked ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-foreground">{displayValue}</span>
              <span className="text-xs text-muted-foreground">🔒</span>
            </div>
          ) : (
            <button
              onClick={() => warning ? setConfirming(true) : onSave(!(rawValue as boolean))}
              className={`relative w-10 h-5 rounded-full transition-colors ${rawValue ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rawValue ? 'translate-x-5' : ''}`} />
            </button>
          )}
        </div>
        {/* Warning confirmation for bool */}
        {confirming && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 mt-1 space-y-2">
            <p className="text-xs text-amber-800 dark:text-amber-300">{warning}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirming(false); onSave(!(rawValue as boolean)) }}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >Procedi</button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-muted-foreground hover:underline"
              >Annulla</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Text / date / number / select ─────────────────────────────────────────

  return (
    <div className={`flex flex-col gap-0.5 py-2 border-b last:border-0 ${bg}`}>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
        {approved && <span className="text-[9px] font-bold text-emerald-600 ml-1">✓</span>}
        {pending  && !editing && !confirming && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 ml-1">In attesa</span>
        )}
        {flagged && !editing && !confirming && (
          <span className="text-[10px] font-bold text-white bg-red-500 rounded px-1.5 py-0.5 ml-1">Da correggere</span>
        )}
      </div>

      {/* Warning confirmation step */}
      {confirming && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 mt-1 space-y-2">
          <p className="text-xs text-amber-800 dark:text-amber-300">{warning}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirming(false); startEdit() }}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >Procedi</button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-muted-foreground hover:underline"
            >Annulla</button>
          </div>
        </div>
      )}

      {/* Edit input — uncontrolled so the DOM always has the latest typed value */}
      {editing ? (
        <div className="flex items-center gap-2">
          {type === 'select' ? (
            <select
              ref={fieldRef as React.RefObject<HTMLSelectElement>}
              defaultValue={rawValue != null ? String(rawValue) : ''}
              autoFocus
              className="flex-1 text-sm border border-input rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring bg-background"
            >
              <option value="">—</option>
              {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              ref={fieldRef as React.RefObject<HTMLInputElement>}
              type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
              defaultValue={rawValue != null ? String(rawValue) : ''}
              autoFocus
              className="flex-1 text-sm border border-input rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-emerald-600 font-bold text-lg leading-none disabled:opacity-50"
          >✓</button>
          <button
            onClick={() => setEditing(false)}
            className="text-muted-foreground text-lg leading-none"
          >✕</button>
        </div>
      ) : !confirming && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">{displayValue || '—'}</span>
          {!locked && (
            <button
              onClick={handlePencilClick}
              className="text-muted-foreground hover:text-foreground text-xs shrink-0"
              title="Modifica"
            >✏️</button>
          )}
          {locked && <span className="text-xs text-muted-foreground shrink-0">🔒</span>}
        </div>
      )}

      {flagged && validation?.note && !editing && !confirming && (
        <p className="text-xs font-medium text-red-700 dark:text-red-400 mt-0.5">{validation.note}</p>
      )}
    </div>
  )
}

// ─── Section card wrapper (read-only header, no edit controls) ─────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="px-4 py-1">
        {children}
      </div>
    </div>
  )
}

// ─── Read-only field (for email) ──────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b last:border-0">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

// ─── Document group helpers ───────────────────────────────────────────────────

const IDENTITY_TYPES = new Set(['IDENTITY', 'IDENTITY_FRONT', 'IDENTITY_BACK'])
const INCOME_TYPES   = new Set(['PAYSLIP', 'TAX_RETURN', 'EMPLOYMENT_CONTRACT', 'BANK_STATEMENT'])
const OTHER_TYPES    = new Set(['LANDLORD_REFERENCE', 'OTHER'])

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ docs, validations, onDelete, onAdd }: {
  docs:        DocumentDto[]
  validations: FieldValidationDto[]
  onDelete:    (id: string) => void
  onAdd:       (filename: string) => void
}) {
  const { t } = useLang()
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [viewerDocId, setViewerDocId] = useState<string | null>(null)
  const vmap = Object.fromEntries(validations.map(v => [v.fieldName, v]))

  // Single document card (used inside type sections)
  const DocCard = ({ doc, groupField }: { doc: DocumentDto; groupField: string }) => {
    const docVal           = vmap[groupField]
    const canDelete        = !doc.verified && docVal?.status !== 'APPROVED'
    const quickCheckPassed = doc.extractedData?.quick_check_passed as boolean | undefined
    const quickCheckNote   = doc.extractedData?.quick_check_note   as string | undefined
    const aiFailed         = quickCheckPassed === false
    const cardBg =
      docVal?.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/20' :
      docVal?.status === 'FLAGGED'  ? 'bg-red-50 dark:bg-red-950/20' :
      aiFailed                      ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-card'

    return (
      <div className={`rounded-lg border p-3 flex items-start gap-2.5 ${cardBg} ${
        aiFailed && docVal?.status !== 'APPROVED' ? 'border-orange-300 dark:border-orange-700' : ''
      }`}>
        <span className="text-xl shrink-0 mt-0.5">{aiFailed && docVal?.status !== 'APPROVED' ? '⚠️' : '📄'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {t(`doc.type.${doc.type}` as Parameters<typeof t>[0])}
          </p>
          <p className="text-[11px] text-muted-foreground">{fmtDate(doc.uploadedAt)}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {quickCheckPassed === true  && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">{t('doc.ai_check_ok')}</span>}
            {quickCheckPassed === false && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">{t('doc.ai_check_fail')}</span>}
            {quickCheckPassed === undefined && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">{t('doc.ai_check_pending')}</span>}
            {docVal?.status === 'APPROVED' && <span className="text-[10px] font-semibold text-emerald-600">✓ Validato</span>}
            {docVal?.status === 'FLAGGED'  && <span className="text-[10px] font-semibold text-red-500">✕ Da correggere</span>}
            <button onClick={() => setViewerDocId(doc.id)}
              className="text-[10px] text-primary underline">
              Visualizza
            </button>
          </div>
          {aiFailed && quickCheckNote && docVal?.status !== 'APPROVED' && (
            <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-1 bg-orange-100/60 rounded px-1.5 py-0.5">{quickCheckNote}</p>
          )}
          {docVal?.status === 'FLAGGED' && docVal.note && (
            <p className="text-[11px] text-red-600 italic mt-0.5">{docVal.note}</p>
          )}
        </div>
        {canDelete && (
          confirmId === doc.id ? (
            <div className="flex flex-col gap-1 items-end shrink-0 text-xs">
              <span className="text-destructive">{t('doc.delete.confirm')}</span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmId(null)} className="text-muted-foreground">{t('profile.cancel')}</button>
                <button onClick={() => { onDelete(doc.id); setConfirmId(null) }} className="font-semibold text-destructive">{t('doc.delete')}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmId(doc.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 pt-0.5">✕</button>
          )
        )}
      </div>
    )
  }

  // A subsection for one document type with an upload slot
  const TypeSection = ({ type, groupField, multi = false }: { type: string; groupField: string; multi?: boolean }) => {
    const typeDocs = docs.filter(d => d.type === type)
    return (
      <div className="space-y-2 pt-3 first:pt-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {t(`doc.type.${type}` as Parameters<typeof t>[0])}
          </span>
          {(multi || typeDocs.length === 0) && (
            <UploadButton expectedTypes={[type]} onUploaded={onAdd} disabled={false} highlight={false} />
          )}
        </div>
        {typeDocs.length === 0 ? (
          <div className="rounded-lg border border-dashed py-3 text-center text-[11px] text-muted-foreground">
            Nessun documento caricato
          </div>
        ) : (
          <div className="space-y-2">
            {typeDocs.map(d => <DocCard key={d.id} doc={d} groupField={groupField} />)}
            {multi && (
              <div className="flex justify-end pt-1">
                <UploadButton expectedTypes={[type]} onUploaded={onAdd} disabled={false} highlight={false} />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Identity slot for a specific side (IDENTITY_FRONT or IDENTITY_BACK)
  const IdentitySlot = ({ type, sideLabel }: { type: string; sideLabel: string }) => {
    const doc = docs.find(d => d.type === type)
    return (
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-[11px] font-semibold text-center text-muted-foreground">{sideLabel}</p>
        {doc ? (
          <DocCard doc={doc} groupField="doc.IDENTITY" />
        ) : (
          <div className="rounded-lg border border-dashed py-4 flex flex-col items-center gap-2">
            <span className="text-2xl opacity-25">📄</span>
            <p className="text-[10px] text-muted-foreground">Carica {sideLabel.toLowerCase()}</p>
            <UploadButton expectedTypes={[type]} onUploaded={onAdd} disabled={false} highlight={false} />
          </div>
        )}
      </div>
    )
  }

  const legacyIdentityDocs = docs.filter(d => d.type === 'IDENTITY')
  const identityGroupVal   = vmap['doc.IDENTITY']

  return (
    <div className="space-y-5">

      {/* ── Documento d'identità ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold">Documento d'identità</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Carta d'identità, patente o passaporto</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {identityGroupVal?.status === 'APPROVED' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Validato</span>
            )}
            {identityGroupVal?.status === 'FLAGGED' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">✕ Da correggere</span>
            )}
          </div>
        </div>

        {/* Legacy IDENTITY docs (uploaded via onboarding chat) */}
        {legacyIdentityDocs.length > 0 ? (
          <div className="space-y-2">
            {legacyIdentityDocs.map(d => <DocCard key={d.id} doc={d} groupField="doc.IDENTITY" />)}
            <p className="text-[10px] text-muted-foreground text-center">
              Puoi aggiungere fronte e retro separatamente caricando nuovi documenti.
            </p>
          </div>
        ) : (
          /* New-style front + back slots */
          <div className="flex gap-3">
            <IdentitySlot type="IDENTITY_FRONT" sideLabel="Fronte" />
            <IdentitySlot type="IDENTITY_BACK"  sideLabel="Retro" />
          </div>
        )}

        {identityGroupVal?.status === 'FLAGGED' && identityGroupVal.note && (
          <p className="text-xs text-red-600 italic">{identityGroupVal.note}</p>
        )}
      </div>

      {/* ── Documenti reddituali ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 space-y-0 divide-y">
        <div className="pb-3">
          <h3 className="text-sm font-semibold">Documenti reddituali</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Buste paga, 730/CU, contratto di lavoro, estratto conto</p>
        </div>
        <TypeSection type="PAYSLIP"              groupField="doc.PAYSLIP"              multi />
        <TypeSection type="TAX_RETURN"           groupField="doc.TAX_RETURN" />
        <TypeSection type="EMPLOYMENT_CONTRACT"  groupField="doc.EMPLOYMENT_CONTRACT" />
        <TypeSection type="BANK_STATEMENT"       groupField="doc.BANK_STATEMENT" />
      </div>

      {/* ── Altri documenti ──────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 space-y-0 divide-y">
        <div className="pb-3">
          <h3 className="text-sm font-semibold">Altri documenti</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Referenza del locatore precedente e altri allegati opzionali</p>
        </div>
        <TypeSection type="LANDLORD_REFERENCE" groupField="doc.LANDLORD_REFERENCE" />
        <TypeSection type="OTHER"              groupField="doc.OTHER"               multi />
      </div>

      {/* ── Document viewer modal ──────────────────────────────────────────── */}
      {viewerDocId && (
        <Suspense fallback={null}>
          <DocumentViewerModal
            fetchPreview={() => {
              const token = localStorage.getItem('auth_token') ?? ''
              return fetch(`/api/tenant/documents/${viewerDocId}/preview`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            }}
            onClose={() => setViewerDocId(null)}
          />
        </Suspense>
      )}
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
          <AreaPreviewMap areas={areas} />
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

// ─── Pending actions from supervisor ─────────────────────────────────────────

function PendingActionsSection() {
  const { t } = useLang()
  const [notes,   setNotes]   = useState<SupervisorNoteDto[]>([])
  const [loading, setLoading] = useState(true)
  const [replying, setReplying] = useState<string | null>(null)

  useEffect(() => {
    tenantApi.getPendingActions()
      .then(setNotes)
      .finally(() => setLoading(false))
  }, [])

  const handleReply = async (noteId: string) => {
    setReplying(noteId)
    try {
      const updated = await tenantApi.markActionReplied(noteId)
      setNotes(ns => ns.map(n => n.id === noteId ? updated : n))
    } finally { setReplying(null) }
  }

  if (loading) return <div className="text-sm text-muted-foreground text-center py-8">Caricamento…</div>

  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nessuna richiesta dal supervisore.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Il supervisore ti ha inviato le seguenti richieste. Carica i documenti mancanti nella sezione Documenti, poi premi "Ho completato".
      </p>
      {notes.map(note => {
        const isPending  = note.status === 'PENDING'
        const isReplied  = note.status === 'REPLIED'
        const isResolved = note.status === 'RESOLVED'
        const items = (note.requestedItems ?? [])
          .map(v => t(`checklist.${v}` as Parameters<typeof t>[0]))

        const borderCls = isResolved ? 'border-emerald-200' : isPending ? 'border-amber-300' : 'border-blue-200'
        const bgCls     = isResolved ? 'bg-emerald-50 dark:bg-emerald-950/20' : isPending ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-blue-50 dark:bg-blue-950/20'

        return (
          <div key={note.id} className={`rounded-xl border p-4 space-y-3 ${borderCls} ${bgCls}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isResolved ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  isReplied  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                               'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  {isResolved ? 'Chiuso' : isReplied ? 'Risposto' : 'Da completare'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.sentAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {isPending && (
                <button
                  onClick={() => handleReply(note.id)}
                  disabled={replying === note.id}
                  className="shrink-0 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 font-semibold"
                >
                  {replying === note.id ? '…' : 'Ho completato ✓'}
                </button>
              )}
            </div>

            {note.message && (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.message}</p>
            )}

            {items.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Documenti / dati richiesti</p>
                <ul className="space-y-1">
                  {items.map((label, i) => (
                    <li key={i} className="text-xs flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] shrink-0 ${
                        isResolved ? 'border-emerald-500 bg-emerald-100 text-emerald-700' : 'border-muted-foreground/40'
                      }`}>
                        {isResolved ? '✓' : ''}
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tenant guarantor section ─────────────────────────────────────────────────

const EMPLOYMENT_KEYS = ['EMPLOYEE', 'SELF_EMPLOYED', 'STUDENT', 'RETIRED', 'OTHER'] as const
const CONTRACT_KEYS   = ['PERMANENT', 'FIXED_TERM', 'APPRENTICESHIP', 'INTERNSHIP', 'FREELANCE', 'OTHER'] as const

function TenantGuarantorSection({ isStudent }: { isStudent: boolean }) {
  const { t } = useLang()
  const [guarantors, setGuarantors] = useState<GuarantorDto[]>([])
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState<Partial<GuarantorRequest>>({})

  useEffect(() => {
    tenantApi.listGuarantors()
      .then(setGuarantors)
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!form.fullName?.trim() && !form.declaredMonthlyIncome) return
    setSaving(true)
    try {
      const req: GuarantorRequest = {
        roleLabel:            form.roleLabel ?? (isStudent ? 'Genitore' : 'Garante'),
        fullName:             form.fullName ?? null,
        fiscalCode:           form.fiscalCode ?? null,
        employmentType:       form.employmentType ?? null,
        contractType:         form.contractType ?? null,
        employmentStartDate:  form.employmentStartDate ?? null,
        employmentEndDate:    form.employmentEndDate ?? null,
        declaredMonthlyIncome: form.declaredMonthlyIncome ?? null,
      }
      const created = await tenantApi.addGuarantor(req)
      setGuarantors(gs => [...gs, created])
      setForm({})
      setAdding(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo garante?')) return
    await tenantApi.deleteGuarantor(id)
    setGuarantors(gs => gs.filter(g => g.id !== id))
  }

  if (loading) return <div className="text-sm text-muted-foreground text-center py-8">Caricamento…</div>

  const addLabel = isStudent ? '+ Aggiungi genitore/garante' : '+ Aggiungi garante'

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {isStudent
          ? 'Aggiungi i dati dei tuoi genitori o di chi farà da garante per te. Questi dati migliorano il tuo profilo.'
          : 'Se hai un garante, aggiungilo qui. I suoi dati migliorano il calcolo degli indici di affidabilità.'}
      </p>

      {guarantors.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nessun garante aggiunto.
        </div>
      )}

      {guarantors.map(g => (
        <div key={g.id} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{g.fullName || '—'}</p>
              <p className="text-xs text-muted-foreground">{g.roleLabel}</p>
            </div>
            <button
              onClick={() => handleDelete(g.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >✕</button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {g.employmentType && (
              <div><span className="text-muted-foreground">Impiego</span><br />{t(`profile.employmentType.${g.employmentType}` as Parameters<typeof t>[0])}</div>
            )}
            {g.contractType && (
              <div><span className="text-muted-foreground">Contratto</span><br />{t(`profile.contractType.${g.contractType}` as Parameters<typeof t>[0])}</div>
            )}
            {g.declaredMonthlyIncome != null && (
              <div><span className="text-muted-foreground">Reddito dichiarato</span><br />€ {g.declaredMonthlyIncome.toLocaleString('it-IT')}</div>
            )}
            {g.incomeVerified && g.verifiedMonthlyIncome != null && (
              <div><span className="text-muted-foreground">Reddito verificato</span><br />
                <span className="text-emerald-600 font-semibold">€ {g.verifiedMonthlyIncome.toLocaleString('it-IT')}</span>
              </div>
            )}
          </div>
          {g.incomeVerified && (
            <p className="text-[10px] text-emerald-600 font-medium">✓ Reddito verificato dal supervisore</p>
          )}
        </div>
      ))}

      {adding ? (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold">{isStudent ? 'Aggiungi genitore / garante' : 'Aggiungi garante'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Ruolo</label>
              <input
                type="text"
                value={form.roleLabel ?? ''}
                onChange={e => setForm(f => ({ ...f, roleLabel: e.target.value }))}
                placeholder={isStudent ? 'Es. Madre, Padre' : 'Es. Garante'}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Nome completo</label>
              <input
                type="text"
                value={form.fullName ?? ''}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Codice fiscale</label>
              <input
                type="text"
                value={form.fiscalCode ?? ''}
                onChange={e => setForm(f => ({ ...f, fiscalCode: e.target.value }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Tipo impiego</label>
              <select
                value={form.employmentType ?? ''}
                onChange={e => setForm(f => ({ ...f, employmentType: e.target.value || null }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">—</option>
                {EMPLOYMENT_KEYS.map(v => <option key={v} value={v}>{t(`profile.employmentType.${v}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Tipo contratto</label>
              <select
                value={form.contractType ?? ''}
                onChange={e => setForm(f => ({ ...f, contractType: e.target.value || null }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">—</option>
                {CONTRACT_KEYS.map(v => <option key={v} value={v}>{t(`profile.contractType.${v}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Inizio lavoro</label>
              <input
                type="date"
                value={form.employmentStartDate ?? ''}
                onChange={e => setForm(f => ({ ...f, employmentStartDate: e.target.value || null }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Fine contratto</label>
              <input
                type="date"
                value={form.employmentEndDate ?? ''}
                onChange={e => setForm(f => ({ ...f, employmentEndDate: e.target.value || null }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground uppercase font-semibold block mb-1">Reddito mensile netto (€)</label>
              <input
                type="number"
                value={form.declaredMonthlyIncome ?? ''}
                onChange={e => setForm(f => ({ ...f, declaredMonthlyIncome: e.target.value ? Number(e.target.value) : null }))}
                className="w-full text-sm border rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving || (!form.fullName?.trim() && form.declaredMonthlyIncome == null)}
              className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90"
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
            <button
              onClick={() => { setAdding(false); setForm({}) }}
              className="px-4 py-2 text-sm border rounded-lg text-muted-foreground hover:text-foreground"
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
        >
          {addLabel}
        </button>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'documents' | 'areas' | 'guarantors' | 'actions' | 'breakdown'

export default function TenantProfilePage() {
  const { t }    = useLang()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [data, setData]           = useState<TenantProfileDto | null>(null)
  const [validations, setValidations] = useState<FieldValidationDto[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<Tab>((params.get('tab') as Tab) || 'profile')

  const vmap = Object.fromEntries(validations.map(v => [v.fieldName, v]))

  const loadValidations = () => {
    tenantApi.getMyValidations()
      .then(setValidations)
      .catch(() => {})
  }

  useEffect(() => {
    tenantApi.getProfile()
      .then(d => {
        setData(d)
        if (d.profileId) loadValidations()
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Caricamento…
    </div>
  )
  if (!data) return null

  // ── Per-field save helper ───────────────────────────────────────────────────

  const saveField = async (payload: TenantUpdatePayload) => {
    const updated = await tenantApi.updateProfile(payload)
    setData(updated)
    if (updated.profileId) loadValidations()
  }

  // ── Document handlers ───────────────────────────────────────────────────────

  const handleDeleteDoc = async (id: string) => {
    try {
      await tenantApi.deleteDocument(id)
      setData(d => d ? { ...d, documents: d.documents.filter(doc => doc.id !== id) } : d)
    } catch { /* ignore */ }
  }

  const handleDocAdded = () => {
    tenantApi.getProfile().then(setData).catch(console.error)
  }

  // ── Area saved ──────────────────────────────────────────────────────────────

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
    data.verificationStatus === 'VERIFIED'           ? { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Verificato'       } :
    data.verificationStatus === 'PENDING_VALIDATION' ? { cls: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'In validazione'   } :
    data.verificationStatus === 'IN_VALIDATION'      ? { cls: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'In revisione'     } :
    data.verificationStatus === 'NEEDS_CORRECTION'   ? { cls: 'bg-red-100 text-red-700 border-red-200',             label: 'Da correggere'    } :
    data.verificationStatus === 'PARTIAL'            ? { cls: 'bg-amber-100 text-amber-700 border-amber-200',       label: t('home.status.partial')  } :
                                                       { cls: 'bg-slate-100 text-slate-500 border-slate-200',        label: t('home.status.none')     }

  return (
    <div className="flex flex-col">

      {/* ── Sub-header ── */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
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
      <div className="px-4 pt-5 pb-3 max-w-5xl mx-auto w-full">
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
        <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {([
            { id: 'profile' as Tab,    label: t('profile.section.personal').split(' ')[0] },
            { id: 'documents' as Tab,  label: t('profile.section.documents') },
            { id: 'areas' as Tab,      label: t('profile.section.areas').split(' ')[0] },
            { id: 'guarantors' as Tab, label: 'Garanti' },
            { id: 'actions' as Tab,    label: 'Richieste' },
          { id: 'breakdown' as Tab,  label: 'Dettagli' },
          ]).map(({ id: tabId, label }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${tab === tabId
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 max-w-5xl mx-auto w-full space-y-4">

        {/* ── PROFILE tab ── */}
        {tab === 'profile' && (
          <>
            {/* Banner NEEDS_CORRECTION */}
            {data.verificationStatus === 'NEEDS_CORRECTION' && (
              <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 p-4 flex gap-3 mb-1">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-red-700">Profilo da correggere</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Il supervisore ha segnalato alcuni campi. Correggi i campi evidenziati in rosso, poi il tuo profilo tornerà automaticamente in validazione.
                  </p>
                </div>
              </div>
            )}

            {/* Personal */}
            <SectionCard title={t('profile.section.personal')}>
              <ReadOnlyField label="Email" value={data.email} />
              <EditableFieldRow
                label="Telefono"
                displayValue={data.phone ?? ''}
                rawValue={data.phone}
                validation={vmap['phone']}
                onSave={v => saveField({ phone: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.fullName')}
                displayValue={data.fullName ?? ''}
                rawValue={data.fullName}
                validation={vmap['fullName']}
                onSave={v => saveField({ fullName: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.birthDate')}
                displayValue={fmtDate(data.birthDate)}
                rawValue={data.birthDate}
                validation={vmap['birthDate']}
                type="date"
                onSave={v => saveField({ birthDate: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.birthPlace')}
                displayValue={data.birthPlace ?? ''}
                rawValue={data.birthPlace}
                validation={vmap['birthPlace']}
                onSave={v => saveField({ birthPlace: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.residence')}
                displayValue={data.residence ?? ''}
                rawValue={data.residence}
                validation={vmap['residence']}
                onSave={v => saveField({ residence: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.fiscalCode')}
                displayValue={data.fiscalCode ?? ''}
                rawValue={data.fiscalCode}
                validation={vmap['fiscalCode']}
                onSave={v => saveField({ fiscalCode: v as string | null })}
              />
            </SectionCard>

            {/* Employment */}
            <SectionCard title={t('profile.section.employment')}>
              <EditableFieldRow
                label={t('profile.employmentType')}
                displayValue={data.employmentType
                  ? t(`profile.employmentType.${data.employmentType}` as Parameters<typeof t>[0])
                  : ''}
                rawValue={data.employmentType}
                validation={vmap['employmentType']}
                type="select"
                options={employmentOptions}
                lockWhenApproved={false}
                warning="Modificando i dati lavorativi il profilo sarà inviato nuovamente in validazione. Ti consigliamo di caricare nuova documentazione reddituale per supportare le modifiche."
                onSave={v => saveField({ employmentType: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.monthlyIncome')}
                displayValue={fmtMoney(data.monthlyIncome)}
                rawValue={data.monthlyIncome}
                validation={vmap['monthlyIncome']}
                type="number"
                lockWhenApproved={false}
                warning="Modificando i dati lavorativi il profilo sarà inviato nuovamente in validazione. Ti consigliamo di caricare nuova documentazione reddituale per supportare le modifiche."
                onSave={v => saveField({ monthlyIncome: v as number | null })}
              />
              <EditableFieldRow
                label={t('profile.contractType')}
                displayValue={data.contractType ? t(`profile.contractType.${data.contractType}` as Parameters<typeof t>[0]) : ''}
                rawValue={data.contractType}
                type="select"
                options={CONTRACT_KEYS.map(v => ({ value: v, label: t(`profile.contractType.${v}`) }))}
                validation={vmap['contractType']}
                lockWhenApproved={false}
                warning="Modificando i dati lavorativi il profilo sarà inviato nuovamente in validazione. Ti consigliamo di caricare nuova documentazione reddituale per supportare le modifiche."
                onSave={v => saveField({ contractType: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.employmentStart')}
                displayValue={fmtDate(data.employmentStartDate)}
                rawValue={data.employmentStartDate}
                validation={vmap['employmentStartDate']}
                type="date"
                lockWhenApproved={false}
                warning="Modificando i dati lavorativi il profilo sarà inviato nuovamente in validazione. Ti consigliamo di caricare nuova documentazione reddituale per supportare le modifiche."
                onSave={v => saveField({ employmentStartDate: v as string | null })}
              />
            </SectionCard>

            {/* Housing preferences */}
            <SectionCard title={t('profile.section.housing')}>
              <EditableFieldRow
                label={t('profile.maxBudget')}
                displayValue={fmtMoney(data.maxBudget)}
                rawValue={data.maxBudget}
                validation={vmap['maxBudget']}
                type="number"
                lockWhenApproved={false}
                warning="Modificando le preferenze abitative il profilo sarà inviato nuovamente in validazione al supervisore."
                onSave={v => saveField({ maxBudget: v as number | null })}
              />
              <EditableFieldRow
                label={t('profile.moveInDate')}
                displayValue={fmtDate(data.moveInDate)}
                rawValue={data.moveInDate}
                validation={vmap['moveInDate']}
                type="date"
                lockWhenApproved={false}
                warning="Modificando le preferenze abitative il profilo sarà inviato nuovamente in validazione al supervisore."
                onSave={v => saveField({ moveInDate: v as string | null })}
              />
              <EditableFieldRow
                label={t('profile.occupants')}
                displayValue={data.occupants != null ? String(data.occupants) : ''}
                rawValue={data.occupants}
                validation={vmap['occupants']}
                type="number"
                lockWhenApproved={false}
                warning="Modificando le preferenze abitative il profilo sarà inviato nuovamente in validazione al supervisore."
                onSave={v => saveField({ occupants: v as number | null })}
              />
              <EditableFieldRow
                label={t('profile.hasPets')}
                displayValue={data.hasPets ? t('profile.yes') : t('profile.no')}
                rawValue={data.hasPets}
                validation={vmap['hasPets']}
                type="bool"
                lockWhenApproved={false}
                warning="Modificando le preferenze abitative il profilo sarà inviato nuovamente in validazione al supervisore."
                onSave={v => saveField({ hasPets: v as boolean })}
              />
              <EditableFieldRow
                label={t('profile.smoker')}
                displayValue={data.smoker ? t('profile.yes') : t('profile.no')}
                rawValue={data.smoker}
                validation={vmap['smoker']}
                type="bool"
                lockWhenApproved={false}
                warning="Modificando le preferenze abitative il profilo sarà inviato nuovamente in validazione al supervisore."
                onSave={v => saveField({ smoker: v as boolean })}
              />
            </SectionCard>

            {/* Guarantor */}
            <SectionCard title={t('profile.section.guarantor')}>
              <EditableFieldRow
                label={t('profile.hasGuarantor')}
                displayValue={data.hasGuarantor ? t('profile.yes') : t('profile.no')}
                rawValue={data.hasGuarantor}
                validation={vmap['hasGuarantor']}
                type="bool"
                lockWhenApproved={false}
                warning="Modificando i dati del garante il profilo sarà inviato nuovamente in validazione. Ti consigliamo di caricare nuova documentazione relativa al garante."
                onSave={v => saveField({ hasGuarantor: v as boolean })}
              />
              {data.hasGuarantor && (
                <EditableFieldRow
                  label={t('profile.guarantorIncome')}
                  displayValue={fmtMoney(data.guarantorIncome)}
                  rawValue={data.guarantorIncome}
                  validation={vmap['guarantorIncome']}
                  type="number"
                  lockWhenApproved={false}
                  warning="Modificando i dati del garante il profilo sarà inviato nuovamente in validazione. Ti consigliamo di caricare nuova documentazione relativa al garante."
                  onSave={v => saveField({ guarantorIncome: v as number | null })}
                />
              )}
            </SectionCard>
          </>
        )}

        {/* ── DOCUMENTS tab ── */}
        {tab === 'documents' && (
          <DocumentsTab
            docs={data.documents}
            validations={validations}
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

        {/* ── GUARANTORS tab ── */}
        {tab === 'guarantors' && (
          <TenantGuarantorSection
            isStudent={data.employmentType === 'STUDENT'}
          />
        )}

        {/* ── ACTIONS tab ── */}
        {tab === 'actions' && (
          <PendingActionsSection />
        )}

        {/* ── BREAKDOWN tab ── */}
        {tab === 'breakdown' && (
          <TenantScoreBreakdownPanel />
        )}

      </div>
    </div>
  )
}
