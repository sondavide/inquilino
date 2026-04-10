import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supervisorApi } from '@/api/supervisor'
import type {
  SupervisorProfileDetail,
  FieldValidationDto,
  SupervisorDocumentDto,
  ChatMessageDto,
  InterestAreaDto,
  FiscalCodeAnalysis,
  OnboardingStateInfo,
  ScoreDetailDto,
  ScoreLevel,
} from '@/types'
import { AreaPreviewMap } from '@/components/map/AreaPreviewMap'
import { MapSelector } from '@/components/map/MapSelector'
import type { InterestArea } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('it-IT')
}
function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return `€ ${n.toLocaleString('it-IT')}`
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NONE:               'In onboarding',
  PENDING_VALIDATION: 'In attesa',
  IN_VALIDATION:      'In revisione',
  NEEDS_CORRECTION:   'Da correggere',
  VERIFIED:           'Verificato',
}
const STATUS_COLOR: Record<string, string> = {
  NONE:               'bg-purple-100 text-purple-700 border-purple-200',
  PENDING_VALIDATION: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_VALIDATION:      'bg-blue-100 text-blue-700 border-blue-200',
  NEEDS_CORRECTION:   'bg-red-100 text-red-700 border-red-200',
  VERIFIED:           'bg-emerald-100 text-emerald-700 border-emerald-200',
}

// ─── Field row con controlli di validazione ───────────────────────────────────

function ValidatedFieldRow({
  label,
  value,
  fieldName,
  validation,
  onApprove,
  onFlag,
  onReset,
  working,
  extra,
}: {
  label:      string
  value:      string
  fieldName:  string
  validation: FieldValidationDto | undefined
  onApprove:  (f: string) => void
  onFlag:     (f: string, note: string) => void
  onReset:    (f: string) => void
  working:    string | null
  extra?:     React.ReactNode
}) {
  const [showNote, setShowNote] = useState(false)
  const [note, setNote]         = useState('')

  const status = validation?.status

  const rowBg =
    status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/20' :
    status === 'FLAGGED'  ? 'bg-red-50 dark:bg-red-950/20' : ''

  return (
    <div className={`py-2 border-b last:border-0 ${rowBg}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
          <p className="text-sm text-foreground">{value || '—'}</p>
          {extra}
          {status === 'FLAGGED' && validation?.note && (
            <p className="text-xs text-red-600 mt-0.5 italic">{validation.note}</p>
          )}
          {status === 'FLAGGED' && validation?.correctedAt && (
            <p className="text-[10px] text-emerald-600 mt-0.5">
              Corretto il {fmtDate(validation.correctedAt)}
            </p>
          )}
        </div>

        {/* Azioni */}
        <div className="flex items-center gap-1 shrink-0 pt-2">
          {status === 'APPROVED' ? (
            <>
              <span className="text-[10px] font-semibold text-emerald-600">✓ Approvato</span>
              <button
                onClick={() => onReset(fieldName)}
                disabled={working === fieldName}
                className="p-1 rounded hover:bg-amber-100 text-amber-500 disabled:opacity-30 transition-colors"
                title="Annulla approvazione"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
            </>
          ) : status === 'FLAGGED' ? (
            <span className="text-[10px] font-semibold text-red-500">✕ Segnalato</span>
          ) : null}

          {status !== 'APPROVED' && (
            <button
              onClick={() => onApprove(fieldName)}
              disabled={working === fieldName}
              className="p-1 rounded hover:bg-emerald-100 text-emerald-600 disabled:opacity-30 transition-colors"
              title="Approva"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          )}

          <button
            onClick={() => { setShowNote(!showNote); setNote('') }}
            disabled={working === fieldName}
            className="p-1 rounded hover:bg-red-100 text-red-500 disabled:opacity-30 transition-colors"
            title="Segnala errore"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Nota inline */}
      {showNote && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Descrivi l'errore…"
            className="flex-1 text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-ring bg-background"
          />
          <button
            onClick={() => { if (note.trim()) { onFlag(fieldName, note.trim()); setShowNote(false) } }}
            disabled={!note.trim() || working === fieldName}
            className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors"
          >
            Segnala
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Fiscal Code Chip ─────────────────────────────────────────────────────────

function FiscalCodeChip({ analysis }: { analysis: FiscalCodeAnalysis | null | undefined }) {
  if (!analysis) return null
  const checks = [
    { label: 'Checksum',     ok: analysis.checksumValid },
    { label: 'Anno',         ok: analysis.birthYearMatch },
    { label: 'Mese',         ok: analysis.birthMonthMatch },
    { label: 'Giorno',       ok: analysis.birthDayMatch },
    { label: 'Cognome',      ok: analysis.surnameCodeMatch },
    { label: 'Nome',         ok: analysis.nameCodeMatch },
  ]
  const allOk = checks.every(c => c.ok)
  return (
    <div className={`mt-1.5 rounded-lg border px-2 py-1.5 text-[10px] ${
      allOk ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20' : 'bg-red-50 border-red-200 dark:bg-red-950/20'
    }`}>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`font-bold ${allOk ? 'text-emerald-700' : 'text-red-600'}`}>
          {allOk ? '✓ CF valido' : '✕ CF non corrispondente'}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{analysis.inferredGender === 'F' ? 'F' : 'M'}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono text-muted-foreground" title="Codice comune (Belfiore)">{analysis.extractedBelfioreCode}</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {checks.map(c => (
          <span key={c.label} className={`px-1.5 py-0.5 rounded border font-medium ${
            c.ok ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'
          }`}>
            {c.ok ? '✓' : '✕'} {c.label}
          </span>
        ))}
      </div>
      {(!analysis.surnameCodeMatch || !analysis.nameCodeMatch) && (
        <p className="mt-1 text-muted-foreground">
          Codici CF: cognome <span className="font-mono font-bold">{analysis.cfSurnameCode}</span>{' '}
          (calc. <span className="font-mono">{analysis.calculatedSurnameCode}</span>)
          {' · '}nome <span className="font-mono font-bold">{analysis.cfNameCode}</span>{' '}
          (calc. <span className="font-mono">{analysis.calculatedNameCode}</span>)
        </p>
      )}
    </div>
  )
}

// ─── Sezione con titolo ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b bg-muted/30">
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

// ─── Tab: Profilo ─────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  validations,
  onApprove,
  onFlag,
  onReset,
  working,
  cfAnalysis,
}: {
  profile:     SupervisorProfileDetail
  validations: FieldValidationDto[]
  onApprove:   (f: string) => void
  onFlag:      (f: string, note: string) => void
  onReset:     (f: string) => void
  working:     string | null
  cfAnalysis:  FiscalCodeAnalysis | null
}) {
  const vmap = Object.fromEntries(validations.map(v => [v.fieldName, v]))
  const row  = (label: string, value: string, field: string, extra?: React.ReactNode) => (
    <ValidatedFieldRow key={field} label={label} value={value} fieldName={field}
      validation={vmap[field]} onApprove={onApprove} onFlag={onFlag} onReset={onReset}
      working={working} extra={extra} />
  )

  return (
    <>
      <Section title="Dati utente">
        {row('Email',    profile.email, 'email')}
        {row('Telefono', profile.phone, 'phone')}
      </Section>

      <Section title="Anagrafica">
        {row('Nome completo',     profile.fullName,   'fullName')}
        {row('Data di nascita',   fmtDate(profile.birthDate), 'birthDate')}
        {row('Luogo di nascita',  profile.birthPlace, 'birthPlace')}
        {row('Residenza',         profile.residence,  'residence')}
        {row('Codice fiscale',    profile.fiscalCode, 'fiscalCode',
          <FiscalCodeChip analysis={cfAnalysis} />
        )}
      </Section>

      <Section title="Situazione lavorativa">
        {row('Tipo impiego',     profile.employmentType,    'employmentType')}
        {row('Reddito mensile',  fmtMoney(profile.monthlyIncome), 'monthlyIncome')}
        {row('Tipo contratto',   profile.contractType,      'contractType')}
        {row('Data inizio lav.', fmtDate(profile.employmentStartDate), 'employmentStartDate')}
      </Section>

      <Section title="Garante">
        {row('Ha garante',     profile.hasGuarantor ? 'Sì' : 'No', 'hasGuarantor')}
        {profile.hasGuarantor && row('Reddito garante', fmtMoney(profile.guarantorIncome), 'guarantorIncome')}
      </Section>

      <Section title="Preferenze abitative">
        {row('Budget massimo', fmtMoney(profile.maxBudget),     'maxBudget')}
        {row('Data ingresso',  fmtDate(profile.moveInDate),     'moveInDate')}
        {row('Occupanti',      profile.occupants != null ? String(profile.occupants) : '', 'occupants')}
        {row('Animali',        profile.hasPets ? 'Sì' : 'No',  'hasPets')}
        {row('Fumatore',       profile.smoker  ? 'Sì' : 'No',  'smoker')}
      </Section>
    </>
  )
}

// ─── Tab: Documenti ───────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  IDENTITY: 'Documento d\'identità', PAYSLIP: 'Busta paga',
  EMPLOYMENT_CONTRACT: 'Contratto di lavoro', TAX_RETURN: 'Dichiarazione dei redditi',
  BANK_STATEMENT: 'Estratto conto', LANDLORD_REFERENCE: 'Referenza locatore',
  GUARANTOR_DOCUMENT: 'Documento garante',
}

function DocumentsTab({
  profileId,
  docs,
  validations,
  onApprove,
  onFlag,
  onReset,
  working,
}: {
  profileId:   string
  docs:        SupervisorDocumentDto[]
  validations: FieldValidationDto[]
  onApprove:   (f: string) => void
  onFlag:      (f: string, note: string) => void
  onReset:     (f: string) => void
  working:     string | null
}) {
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const vmap = Object.fromEntries(validations.map(v => [v.fieldName, v]))

  const handlePreview = async (docId: string) => {
    setPreviewingId(docId)
    try {
      const token = localStorage.getItem('auth_token')
      const url   = supervisorApi.getDocumentPreviewUrl(profileId, docId)
      const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const blob  = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { /* ignore */ }
    finally { setPreviewingId(null) }
  }

  return (
    <div className="space-y-3">
      {docs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nessun documento caricato</p>
      )}
      {docs.map(doc => {
        const field = `doc.${doc.type}`
        const val   = vmap[field]
        const bg    = val?.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/20' :
                      val?.status === 'FLAGGED'  ? 'bg-red-50 dark:bg-red-950/20' : ''
        const [showNote, setShowNote] = useState(false)
        const [note, setNote]         = useState('')

        return (
          <div key={doc.id} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{DOC_LABELS[doc.type] ?? doc.type}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(doc.uploadedAt)}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    doc.verified
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    {doc.verified ? 'Verif. AI' : 'Non verif.'}
                  </span>
                  {val?.status === 'APPROVED' && (
                    <span className="text-[10px] font-semibold text-emerald-600">✓ Approvato</span>
                  )}
                  {val?.status === 'FLAGGED' && (
                    <span className="text-[10px] font-semibold text-red-500">✕ Segnalato</span>
                  )}
                  <button
                    onClick={() => handlePreview(doc.id)}
                    disabled={previewingId === doc.id}
                    className="text-[10px] text-primary underline disabled:opacity-50"
                  >
                    {previewingId === doc.id ? '…' : 'Visualizza'}
                  </button>
                </div>
                {val?.status === 'FLAGGED' && val.note && (
                  <p className="text-xs text-red-600 mt-1 italic">{val.note}</p>
                )}
                {val?.status === 'FLAGGED' && val.correctedAt && (
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Corretto il {fmtDate(val.correctedAt)}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {val?.status === 'APPROVED' ? (
                  <button
                    onClick={() => onReset(field)}
                    disabled={working === field}
                    className="p-1.5 rounded hover:bg-amber-100 text-amber-500 disabled:opacity-30 transition-colors"
                    title="Annulla approvazione"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                ) : (
                  <button
                    onClick={() => onApprove(field)}
                    disabled={working === field}
                    className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600 disabled:opacity-30 transition-colors"
                    title="Approva documento"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                )}
                <button
                  onClick={() => { setShowNote(!showNote); setNote('') }}
                  disabled={working === field}
                  className="p-1.5 rounded hover:bg-red-100 text-red-500 disabled:opacity-30 transition-colors"
                  title="Segnala errore"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            {showNote && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Descrivi il problema col documento…"
                  className="flex-1 text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-ring bg-background"
                />
                <button
                  onClick={() => { if (note.trim()) { onFlag(field, note.trim()); setShowNote(false) } }}
                  disabled={!note.trim() || working === field}
                  className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg disabled:opacity-50 hover:bg-red-600"
                >
                  Segnala
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Chat history ────────────────────────────────────────────────────────

function ChatTab({
  messages,
  onboardingState,
  onAdvanceStep,
  advancing,
}: {
  messages:       ChatMessageDto[]
  onboardingState: OnboardingStateInfo | null
  onAdvanceStep:  () => void
  advancing:      boolean
}) {
  return (
    <div className="space-y-3 pb-4">
      {/* Onboarding progress bar + advance button */}
      {onboardingState && !onboardingState.onboardingCompleted && (
        <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/20 border-purple-200 p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-700">
              Onboarding in corso · {onboardingState.currentStep}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.round((onboardingState.stepNumber / onboardingState.totalSteps) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-purple-600 shrink-0">
                {onboardingState.stepNumber}/{onboardingState.totalSteps}
              </span>
            </div>
          </div>
          <button
            onClick={onAdvanceStep}
            disabled={advancing}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {advancing ? '…' : 'Avanza step →'}
          </button>
        </div>
      )}
      {onboardingState?.onboardingCompleted && (
        <div className="rounded-xl border bg-emerald-50 border-emerald-200 p-3">
          <p className="text-xs font-semibold text-emerald-700">✓ Onboarding completato</p>
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nessun messaggio</p>
      )}
      {messages.map(m => (
        <div key={m.id} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm
            ${m.role === 'USER'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
            }`}>
            <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
            <p className={`text-[10px] mt-1 ${m.role === 'USER' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {m.step ? `${m.step} · ` : ''}{new Date(m.createdAt).toLocaleString('it-IT')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Aree interesse ──────────────────────────────────────────────────────

function AreasTab({ profileId, areas: initialAreas, validations, onApprove, onFlag, onReset, working }: {
  profileId:   string
  areas:       InterestAreaDto[]
  validations: FieldValidationDto[]
  onApprove:   (f: string) => void
  onFlag:      (f: string, note: string) => void
  onReset:     (f: string) => void
  working:     string | null
}) {
  const [areas, setAreas]   = useState<InterestAreaDto[]>(initialAreas)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [flagNote, setFlagNote] = useState('')
  const [showFlagInput, setShowFlagInput] = useState(false)
  const vmap = Object.fromEntries(validations.map(v => [v.fieldName, v]))
  const areaVal = vmap['interestAreas']

  const handleConfirm = async (_msg: string, incoming: InterestArea[]) => {
    setSaving(true)
    try {
      await supervisorApi.updateInterestAreas(profileId, incoming)
      // Refresh
      const updated = await supervisorApi.getInterestAreas(profileId)
      setAreas(updated)
      setEditing(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <MapSelector
        onConfirm={handleConfirm}
        onClose={() => setEditing(false)}
        defaultOpen={true}
        disabled={saving}
        initialAreas={areas}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra validazione aree */}
      <div className={`rounded-xl border p-3 flex items-center gap-2 ${
        areaVal?.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20' :
        areaVal?.status === 'FLAGGED'  ? 'bg-red-50 border-red-200 dark:bg-red-950/20' :
        'bg-muted/30'
      }`}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {areaVal?.status === 'APPROVED' ? '✓ Aree approvate' :
             areaVal?.status === 'FLAGGED'  ? '✕ Aree segnalate' :
             'Valida le aree di interesse'}
          </p>
          {areaVal?.status === 'FLAGGED' && areaVal.note && (
            <p className="text-[10px] text-red-600 italic mt-0.5">{areaVal.note}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {areaVal?.status === 'APPROVED' ? (
            <button onClick={() => onReset('interestAreas')} disabled={working === 'interestAreas'}
              className="p-1.5 rounded hover:bg-amber-100 text-amber-500 disabled:opacity-30 transition-colors" title="Annulla approvazione">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          ) : (
            <button onClick={() => onApprove('interestAreas')} disabled={working === 'interestAreas'}
              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600 disabled:opacity-30 transition-colors" title="Approva">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          )}
          <button onClick={() => { setShowFlagInput(v => !v); setFlagNote('') }} disabled={working === 'interestAreas'}
            className="p-1.5 rounded hover:bg-red-100 text-red-500 disabled:opacity-30 transition-colors" title="Segnala errore">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      {showFlagInput && (
        <div className="flex gap-2">
          <input type="text" value={flagNote} onChange={e => setFlagNote(e.target.value)}
            placeholder="Descrivi il problema con le aree…"
            className="flex-1 text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-ring bg-background" />
          <button
            onClick={() => { if (flagNote.trim()) { onFlag('interestAreas', flagNote.trim()); setShowFlagInput(false) } }}
            disabled={!flagNote.trim() || working === 'interestAreas'}
            className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg disabled:opacity-50 hover:bg-red-600">
            Segnala
          </button>
        </div>
      )}

      {areas.length > 0 ? (
        <>
          <AreaPreviewMap areas={areas} />
          <div className="flex flex-wrap gap-1.5 px-1">
            {areas.map(a => (
              <span key={a.id} className="text-[11px] px-2.5 py-1 rounded-full border font-medium bg-primary/10 text-primary border-primary/20">
                {a.areaType === 'CITY_BOUNDARY' ? '🏙️' : '✏️'} {a.cityName}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">Nessuna area di interesse</p>
      )}
      <button
        onClick={() => setEditing(true)}
        className="w-full py-3 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        Modifica aree
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Tab: Score ───────────────────────────────────────────────────────────────

const SCORE_LABEL: Record<ScoreLevel, string> = { HIGH: 'ALTO', MEDIUM: 'MEDIO', LOW: 'BASSO' }
const SCORE_COLOR: Record<ScoreLevel, string> = {
  HIGH:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW:    'bg-red-100 text-red-700 border-red-200',
}
const LEVELS: ScoreLevel[] = ['HIGH', 'MEDIUM', 'LOW']

function ScoreLevelSelect({ value, onChange }: {
  value: ScoreLevel | null
  onChange: (v: ScoreLevel | null) => void
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors
          ${value === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-muted text-muted-foreground hover:border-foreground'}`}
      >
        Auto
      </button>
      {LEVELS.map(l => (
        <button key={l} onClick={() => onChange(l)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors
            ${value === l ? SCORE_COLOR[l] + ' ring-1 ring-offset-1 ring-current' : 'border-muted text-muted-foreground hover:border-foreground'}`}
        >
          {SCORE_LABEL[l]}
        </button>
      ))}
    </div>
  )
}

function ScoreTab({ profileId, initialScore }: {
  profileId: string
  initialScore: ScoreDetailDto | null
}) {
  const [score, setScore]   = useState<ScoreDetailDto | null>(initialScore)
  const [overrides, setOverrides] = useState({
    rentSustainability:  initialScore?.overrideRentSustainability  ?? null as ScoreLevel | null,
    incomeStability:     initialScore?.overrideIncomeStability     ?? null as ScoreLevel | null,
    documentReliability: initialScore?.overrideDocumentReliability ?? null as ScoreLevel | null,
  })
  const [reason, setReason] = useState(initialScore?.overrideReason ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)

  const anyOverride = overrides.rentSustainability !== null
    || overrides.incomeStability !== null
    || overrides.documentReliability !== null

  const set = (key: keyof typeof overrides, val: ScoreLevel | null) => {
    setOverrides(o => ({ ...o, [key]: val }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await supervisorApi.setScoreOverride(profileId, {
        rentSustainability:  overrides.rentSustainability,
        incomeStability:     overrides.incomeStability,
        documentReliability: overrides.documentReliability,
        reason: reason.trim() || null,
      })
      setScore(updated)
      setDirty(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await supervisorApi.deleteScoreOverride(profileId)
      setOverrides({ rentSustainability: null, incomeStability: null, documentReliability: null })
      setReason('')
      setDirty(false)
      if (score) {
        setScore({
          ...score,
          overrideRentSustainability: null,
          overrideIncomeStability: null,
          overrideDocumentReliability: null,
          overrideReason: null,
          rentSustainability:  score.algoRentSustainability,
          incomeStability:     score.algoIncomeStability,
          documentReliability: score.algoDocumentReliability,
        })
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  if (!score) return (
    <p className="text-sm text-muted-foreground text-center py-8">
      Dati insufficienti per calcolare gli indici
    </p>
  )

  const indicators = [
    {
      key:   'rentSustainability' as const,
      label: 'Sostenibilità affitto',
      algo:  score.algoRentSustainability,
      explanation: score.algoRentSustainabilityExplanation,
    },
    {
      key:   'incomeStability' as const,
      label: 'Stabilità reddito',
      algo:  score.algoIncomeStability,
      explanation: score.algoIncomeStabilityExplanation,
    },
    {
      key:   'documentReliability' as const,
      label: 'Affidabilità documenti',
      algo:  score.algoDocumentReliability,
      explanation: score.algoDocumentReliabilityExplanation,
    },
  ]

  return (
    <div className="space-y-4 pb-4">
      {indicators.map(ind => {
        const ov = overrides[ind.key]
        const effective = ov ?? ind.algo
        return (
          <div key={ind.key} className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">{ind.label}</span>
              <div className="flex items-center gap-1.5">
                {ov !== null && (
                  <span className="text-[10px] text-purple-600 font-medium">override</span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SCORE_COLOR[effective as ScoreLevel]}`}>
                  {SCORE_LABEL[effective as ScoreLevel]}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {ind.explanation}
            </p>
            <div className="pt-1">
              <p className="text-[10px] text-muted-foreground mb-1">Override supervisore:</p>
              <ScoreLevelSelect value={ov} onChange={v => set(ind.key, v)} />
            </div>
          </div>
        )
      })}

      {/* Reason */}
      {(anyOverride || dirty) && (
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1">
            Motivo dell'override (opzionale)
          </label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setDirty(true) }}
            rows={2}
            placeholder="Es. busta paga non standard, reddito da locazione non dichiarato…"
            className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-ring bg-background resize-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Salvataggio…' : 'Salva indici'}
        </button>
        {anyOverride && !dirty && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            Rimuovi override
          </button>
        )}
      </div>
    </div>
  )
}

type Tab = 'profile' | 'documents' | 'chat' | 'areas' | 'score'

export default function ProfileDetailPage() {
  const { profileId }          = useParams<{ profileId: string }>()
  const navigate               = useNavigate()
  const [tab, setTab]          = useState<Tab>('profile')
  const [profile, setProfile]  = useState<SupervisorProfileDetail | null>(null)
  const [validations, setValidations] = useState<FieldValidationDto[]>([])
  const [docs, setDocs]        = useState<SupervisorDocumentDto[]>([])
  const [chat, setChat]        = useState<ChatMessageDto[]>([])
  const [areas, setAreas]      = useState<InterestAreaDto[]>([])
  const [cfAnalysis, setCfAnalysis] = useState<FiscalCodeAnalysis | null>(null)
  const [onboardingState, setOnboardingState] = useState<OnboardingStateInfo | null>(null)
  const [loading, setLoading]  = useState(true)
  const [working, setWorking]  = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (!profileId) return
    Promise.all([
      supervisorApi.getProfile(profileId),
      supervisorApi.getValidations(profileId),
      supervisorApi.getDocuments(profileId),
      supervisorApi.getChatHistory(profileId),
      supervisorApi.getInterestAreas(profileId),
      supervisorApi.getOnboardingState(profileId),
    ]).then(([p, v, d, c, a, obs]) => {
      setProfile(p); setValidations(v); setDocs(d); setChat(c); setAreas(a)
      setOnboardingState(obs)
      // Load CF analysis if fiscal code is present
      if (p.fiscalCode) {
        supervisorApi.getFiscalCodeAnalysis(profileId)
          .then(setCfAnalysis)
          .catch(() => {})
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [profileId])

  const handleApprove = async (fieldName: string) => {
    if (!profileId) return
    setWorking(fieldName)
    try {
      const updated = await supervisorApi.approveField(profileId, fieldName)
      setValidations(vs => {
        const idx = vs.findIndex(v => v.fieldName === fieldName)
        if (idx >= 0) { const copy = [...vs]; copy[idx] = updated; return copy }
        return [...vs, updated]
      })
    } catch { /* ignore */ }
    finally { setWorking(null) }
  }

  const handleReset = async (fieldName: string) => {
    if (!profileId) return
    setWorking(fieldName)
    try {
      await supervisorApi.resetFieldApproval(profileId, fieldName)
      setValidations(vs => vs.map(v =>
        v.fieldName === fieldName ? { ...v, status: 'PENDING' as const, note: null } : v
      ))
    } catch { /* ignore */ }
    finally { setWorking(null) }
  }

  const handleFlag = async (fieldName: string, note: string) => {
    if (!profileId) return
    setWorking(fieldName)
    try {
      const updated = await supervisorApi.flagField(profileId, fieldName, note)
      setValidations(vs => {
        const idx = vs.findIndex(v => v.fieldName === fieldName)
        if (idx >= 0) { const copy = [...vs]; copy[idx] = updated; return copy }
        return [...vs, updated]
      })
    } catch { /* ignore */ }
    finally { setWorking(null) }
  }

  const handleAdvanceStep = async () => {
    if (!profileId) return
    setAdvancing(true)
    try {
      const updated = await supervisorApi.advanceOnboardingStep(profileId)
      setOnboardingState(updated)
    } catch { /* ignore */ }
    finally { setAdvancing(false) }
  }

  const handleCompleteValidation = async () => {
    if (!profileId) return
    setCompleting(true)
    try {
      const result = await supervisorApi.completeValidation(profileId)
      setProfile(p => p ? { ...p, verificationStatus: result.verificationStatus } : p)
    } catch { /* ignore */ }
    finally { setCompleting(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-muted-foreground">
      Caricamento…
    </div>
  )
  if (!profile) return null

  const flaggedCount   = validations.filter(v => v.status === 'FLAGGED').length
  const approvedCount  = validations.filter(v => v.status === 'APPROVED').length

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile',   label: 'Profilo' },
    { id: 'score',     label: 'Indici' },
    { id: 'documents', label: 'Documenti' },
    { id: 'chat',      label: 'Chat' },
    { id: 'areas',     label: 'Aree' },
  ]

  return (
    <div className="w-full px-4 py-4">
      {/* Sub-header */}
      <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b mb-4 z-10">
        <button onClick={() => navigate('/supervisor/profiles')}
                className="text-muted-foreground hover:text-foreground text-lg">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{profile.fullName || profile.email}</h1>
          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
          STATUS_COLOR[profile.verificationStatus] ?? ''
        }`}>
          {STATUS_LABEL[profile.verificationStatus] ?? profile.verificationStatus}
        </span>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-xl border bg-card px-3 py-2 text-center">
          <p className="text-lg font-bold text-emerald-600">{approvedCount}</p>
          <p className="text-[10px] text-muted-foreground">Approvati</p>
        </div>
        <div className="flex-1 rounded-xl border bg-card px-3 py-2 text-center">
          <p className="text-lg font-bold text-red-500">{flaggedCount}</p>
          <p className="text-[10px] text-muted-foreground">Segnalati</p>
        </div>
        <div className="flex-1 rounded-xl border bg-card px-3 py-2 text-center">
          <p className="text-lg font-bold text-foreground">{profile.profileCompletion}%</p>
          <p className="text-[10px] text-muted-foreground">Completamento</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border overflow-hidden bg-muted/20 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-24">
        {tab === 'profile' && (
          <ProfileTab profile={profile} validations={validations}
            onApprove={handleApprove} onFlag={handleFlag} onReset={handleReset}
            working={working} cfAnalysis={cfAnalysis} />
        )}
        {tab === 'documents' && (
          <DocumentsTab profileId={profile.profileId} docs={docs} validations={validations}
            onApprove={handleApprove} onFlag={handleFlag} onReset={handleReset} working={working} />
        )}
        {tab === 'chat' && (
          <ChatTab
            messages={chat}
            onboardingState={onboardingState}
            onAdvanceStep={handleAdvanceStep}
            advancing={advancing}
          />
        )}
        {tab === 'areas' && (
          <AreasTab profileId={profile.profileId} areas={areas} validations={validations}
            onApprove={handleApprove} onFlag={handleFlag} onReset={handleReset} working={working} />
        )}
        {tab === 'score' && (
          <ScoreTab profileId={profile.profileId} initialScore={profile.score ?? null} />
        )}
      </div>

      {/* Bottom action bar — completa validazione */}
      {(profile.verificationStatus === 'IN_VALIDATION' ||
        profile.verificationStatus === 'PENDING_VALIDATION') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
          <div className="w-full">
            {flaggedCount > 0 && (
              <p className="text-xs text-red-500 text-center mb-2">
                {flaggedCount} campo/i segnalato/i — al completamento l'utente verrà notificato di correggere
              </p>
            )}
            <button
              onClick={handleCompleteValidation}
              disabled={completing}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {completing ? 'Salvataggio…' : flaggedCount > 0
                ? `Completa e richiedi correzioni (${flaggedCount})`
                : 'Completa validazione — Approva profilo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
