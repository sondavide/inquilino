import { useEffect, useState } from 'react'
import { supervisorApi } from '@/api/supervisor'
import type { GuarantorDto, GuarantorRequest } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(n: number | null | undefined) {
  if (n == null) return '—'
  return `€ ${n.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`
}
function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('it-IT')
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  EMPLOYEE: 'Dipendente', SELF_EMPLOYED: 'Autonomo', RETIRED: 'Pensionato',
  STUDENT: 'Studente', OTHER: 'Altro',
}
const CONTRACT_LABELS: Record<string, string> = {
  PERMANENT: 'Indeterminato', FIXED_TERM: 'Determinato',
  APPRENTICESHIP: 'Apprendistato', INTERNSHIP: 'Stage', FREELANCE: 'Freelance', OTHER: 'Altro',
}

// ─── Form garante ─────────────────────────────────────────────────────────────

interface FormState {
  roleLabel: string
  fullName: string
  fiscalCode: string
  employmentType: string
  contractType: string
  employmentStartDate: string
  employmentEndDate: string
  declaredMonthlyIncome: string
}

const EMPTY_FORM: FormState = {
  roleLabel: '', fullName: '', fiscalCode: '',
  employmentType: '', contractType: '',
  employmentStartDate: '', employmentEndDate: '',
  declaredMonthlyIncome: '',
}

function guarantorToForm(g: GuarantorDto): FormState {
  return {
    roleLabel: g.roleLabel ?? '',
    fullName: g.fullName ?? '',
    fiscalCode: g.fiscalCode ?? '',
    employmentType: g.employmentType ?? '',
    contractType: g.contractType ?? '',
    employmentStartDate: g.employmentStartDate ?? '',
    employmentEndDate: g.employmentEndDate ?? '',
    declaredMonthlyIncome: g.declaredMonthlyIncome?.toString() ?? '',
  }
}

function formToRequest(f: FormState): GuarantorRequest {
  return {
    roleLabel: f.roleLabel || null,
    fullName: f.fullName || null,
    fiscalCode: f.fiscalCode || null,
    employmentType: f.employmentType || null,
    contractType: f.contractType || null,
    employmentStartDate: f.employmentStartDate || null,
    employmentEndDate: f.employmentEndDate || null,
    declaredMonthlyIncome: f.declaredMonthlyIncome ? parseFloat(f.declaredMonthlyIncome) : null,
  }
}

// ─── Garante card ──────────────────────────────────────────────────────────────

function GuarantorCard({
  g, profileId, isStudent,
  onUpdated, onDeleted,
}: {
  g: GuarantorDto
  profileId: string
  isStudent: boolean
  onUpdated: (g: GuarantorDto) => void
  onDeleted: (id: string) => void
}) {
  const [editing,       setEditing]       = useState(false)
  const [form,          setForm]          = useState<FormState>(guarantorToForm(g))
  const [saving,        setSaving]        = useState(false)
  const [verifyIncome,  setVerifyIncome]  = useState('')
  const [savingVerify,  setSavingVerify]  = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await supervisorApi.updateGuarantor(profileId, g.id, formToRequest(form))
      onUpdated(updated)
      setEditing(false)
    } finally { setSaving(false) }
  }

  async function handleVerifyIncome() {
    if (!verifyIncome) return
    setSavingVerify(true)
    try {
      const updated = await supervisorApi.verifyGuarantorIncome(
        profileId, g.id, parseFloat(verifyIncome))
      onUpdated(updated)
      setVerifyIncome('')
    } finally { setSavingVerify(false) }
  }

  async function handleDelete() {
    if (!confirm(`Eliminare il garante "${g.fullName ?? g.roleLabel ?? 'senza nome'}"?`)) return
    await supervisorApi.deleteGuarantor(profileId, g.id)
    onDeleted(g.id)
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">{g.fullName || '(nome non inserito)'}</p>
          <p className="text-xs text-muted-foreground">
            {g.roleLabel && <span className="mr-2">{g.roleLabel}</span>}
            {g.employmentType && EMPLOYMENT_LABELS[g.employmentType]}
            {g.contractType && ` · ${CONTRACT_LABELS[g.contractType] ?? g.contractType}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(e => !e)}
            className="text-xs px-2 py-1 border rounded-md hover:bg-accent transition-colors">
            {editing ? 'Annulla' : 'Modifica'}
          </button>
          <button onClick={handleDelete}
            className="text-xs px-2 py-1 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 transition-colors">
            Rimuovi
          </button>
        </div>
      </div>

      {/* Dati principali (non editing) */}
      {!editing && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="text-muted-foreground">C.F.</span><br/>{g.fiscalCode || '—'}</div>
          <div><span className="text-muted-foreground">Lavoro dal</span><br/>{fmtDate(g.employmentStartDate)}</div>
          {g.contractType === 'FIXED_TERM' && (
            <div><span className="text-muted-foreground">Scadenza contratto</span><br/>{fmtDate(g.employmentEndDate)}</div>
          )}
          <div>
            <span className="text-muted-foreground">Reddito dichiarato</span><br/>
            {fmtEur(g.declaredMonthlyIncome)}/mese
          </div>
          <div>
            <span className="text-muted-foreground">Reddito verificato</span><br/>
            {g.incomeVerified
              ? <span className="text-emerald-600 font-semibold">{fmtEur(g.verifiedMonthlyIncome)}/mese ✓</span>
              : <span className="text-muted-foreground">non verificato</span>}
          </div>
        </div>
      )}

      {/* Form editing */}
      {editing && (
        <div className="space-y-3 pt-1 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">
                {isStudent ? 'Relazione (es. Padre, Madre)' : 'Ruolo garante'}
              </label>
              <input value={form.roleLabel}
                onChange={e => setForm(f => ({ ...f, roleLabel: e.target.value }))}
                placeholder={isStudent ? 'es. Padre' : 'es. Coniuge, Datore di lavoro'}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Nome completo</label>
              <input value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Codice fiscale</label>
              <input value={form.fiscalCode}
                onChange={e => setForm(f => ({ ...f, fiscalCode: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none uppercase" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Tipo impiego</label>
              <select value={form.employmentType}
                onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none">
                <option value="">—</option>
                {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Tipo contratto</label>
              <select value={form.contractType}
                onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none">
                <option value="">—</option>
                {Object.entries(CONTRACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Lavora dal</label>
              <input type="date" value={form.employmentStartDate}
                onChange={e => setForm(f => ({ ...f, employmentStartDate: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
            {form.contractType === 'FIXED_TERM' && (
              <div>
                <label className="text-[11px] text-muted-foreground uppercase font-semibold">Scadenza contratto</label>
                <input type="date" value={form.employmentEndDate}
                  onChange={e => setForm(f => ({ ...f, employmentEndDate: e.target.value }))}
                  className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
              </div>
            )}
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Reddito dichiarato (€/mese)</label>
              <input type="number" value={form.declaredMonthlyIncome}
                onChange={e => setForm(f => ({ ...f, declaredMonthlyIncome: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      )}

      {/* Verifica reddito (supervisore) */}
      <div className="border-t pt-3 space-y-1">
        <p className="text-[11px] text-muted-foreground uppercase font-semibold">
          Verifica reddito (importo verificato da documenti)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={verifyIncome}
            onChange={e => setVerifyIncome(e.target.value)}
            placeholder="es. 1500"
            className="w-32 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none"
          />
          <span className="text-xs text-muted-foreground">€/mese</span>
          <button onClick={handleVerifyIncome} disabled={savingVerify || !verifyIncome}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg disabled:opacity-50 hover:bg-emerald-700">
            {savingVerify ? '…' : 'Verifica'}
          </button>
          {g.incomeVerified && (
            <span className="text-xs text-emerald-600 font-semibold">
              ✓ Verificato: {fmtEur(g.verifiedMonthlyIncome)}/mese
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GuarantorSection({
  profileId,
  employmentType,
}: {
  profileId: string
  employmentType: string
}) {
  const isStudent = employmentType === 'STUDENT'

  const [guarantors, setGuarantors] = useState<GuarantorDto[]>([])
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    supervisorApi.listGuarantors(profileId)
      .then(setGuarantors)
      .finally(() => setLoading(false))
  }, [profileId])

  async function handleAdd() {
    setSaving(true)
    try {
      const created = await supervisorApi.addGuarantor(profileId, formToRequest(form))
      setGuarantors(gs => [...gs, created])
      setForm(EMPTY_FORM)
      setAdding(false)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento garanti…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            {isStudent ? 'Garanti familiari / genitori' : 'Garanti'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isStudent
              ? 'I dati dei genitori alimentano il calcolo combinato (70% peso famiglia) della stabilità reddituale.'
              : 'Il reddito verificato dei garanti contribuisce sia alla sostenibilità canone che alla stabilità reddituale.'}
          </p>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-xs px-3 py-1.5 border rounded-lg hover:bg-accent transition-colors font-medium">
          {adding ? 'Annulla' : isStudent ? '+ Aggiungi genitore' : '+ Aggiungi garante'}
        </button>
      </div>

      {/* Form nuovo garante */}
      {adding && (
        <div className="rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700">
            {isStudent ? 'Nuovo genitore / garante familiare' : 'Nuovo garante'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">
                {isStudent ? 'Relazione (es. Padre)' : 'Ruolo'}
              </label>
              <input value={form.roleLabel}
                onChange={e => setForm(f => ({ ...f, roleLabel: e.target.value }))}
                placeholder={isStudent ? 'Padre / Madre' : 'Coniuge / Amico / ecc.'}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Nome completo</label>
              <input value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Tipo impiego</label>
              <select value={form.employmentType}
                onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none">
                <option value="">—</option>
                {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Tipo contratto</label>
              <select value={form.contractType}
                onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none">
                <option value="">—</option>
                {Object.entries(CONTRACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Lavora dal</label>
              <input type="date" value={form.employmentStartDate}
                onChange={e => setForm(f => ({ ...f, employmentStartDate: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-semibold">Reddito dichiarato (€/mese)</label>
              <input type="number" value={form.declaredMonthlyIncome}
                onChange={e => setForm(f => ({ ...f, declaredMonthlyIncome: e.target.value }))}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-background outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {saving ? 'Salvataggio…' : 'Aggiungi'}
          </button>
        </div>
      )}

      {/* Lista garanti */}
      {guarantors.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          {isStudent
            ? 'Nessun genitore/garante aggiunto. Aggiungere i dati della famiglia migliora il punteggio.'
            : 'Nessun garante aggiunto.'}
        </div>
      )}
      {guarantors.map(g => (
        <GuarantorCard
          key={g.id}
          g={g}
          profileId={profileId}
          isStudent={isStudent}
          onUpdated={updated => setGuarantors(gs => gs.map(x => x.id === updated.id ? updated : x))}
          onDeleted={id => setGuarantors(gs => gs.filter(x => x.id !== id))}
        />
      ))}
    </div>
  )
}
