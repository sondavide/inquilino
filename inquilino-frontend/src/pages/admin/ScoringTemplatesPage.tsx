import { useEffect, useState } from 'react'
import { ScoringTemplate } from '@/types'
import { scoringTemplateApi } from '@/api/scoringTemplates'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type WeightKey = 'weightIdentity' | 'weightIncome' | 'weightStability' | 'weightDocuments' | 'weightGuarantor'

interface FormState {
  name:            string
  description:     string
  weightIdentity:  number
  weightIncome:    number
  weightStability: number
  weightDocuments: number
  weightGuarantor: number
  isDefault:       boolean
}

const EMPTY_FORM: FormState = {
  name: '', description: '',
  weightIdentity: 20, weightIncome: 20, weightStability: 20,
  weightDocuments: 20, weightGuarantor: 20,
  isDefault: false,
}

const WEIGHT_LABELS: Record<WeightKey, { label: string; hint: string }> = {
  weightIdentity:  { label: 'Identità approvata',    hint: 'Doc. identità approvato dal supervisore' },
  weightIncome:    { label: 'Reddito approvato',      hint: 'Busta paga o dichiarazione dei redditi approvata' },
  weightStability: { label: 'Stabilità lavorativa',   hint: 'EMPLOYEE→pieno · SELF_EMPLOYED/RETIRED→metà · STUDENT/OTHER→0' },
  weightDocuments: { label: 'Affidabilità documenti', hint: 'Ratio documenti approvati su totali (HIGH/MED/LOW)' },
  weightGuarantor: { label: 'Garante',                hint: 'Presenza di un garante dichiarato' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizedPct(form: FormState, key: WeightKey): number {
  const total = form.weightIdentity + form.weightIncome + form.weightStability
              + form.weightDocuments + form.weightGuarantor
  if (total === 0) return 0
  return Math.round((form[key] / total) * 100)
}

function templateToForm(t: ScoringTemplate): FormState {
  return {
    name:            t.name,
    description:     t.description ?? '',
    weightIdentity:  t.weightIdentity,
    weightIncome:    t.weightIncome,
    weightStability: t.weightStability,
    weightDocuments: t.weightDocuments,
    weightGuarantor: t.weightGuarantor,
    isDefault:       t.isDefault,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoringTemplatesPage() {
  const [templates, setTemplates] = useState<ScoringTemplate[]>([])
  const [selected,  setSelected]  = useState<ScoringTemplate | null>(null)
  const [form,      setForm]       = useState<FormState>(EMPTY_FORM)
  const [isNew,     setIsNew]      = useState(false)
  const [saving,    setSaving]     = useState(false)
  const [deleting,  setDeleting]   = useState(false)
  const [error,     setError]      = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await scoringTemplateApi.list()
      setTemplates(data)
    } catch { setError('Errore nel caricamento dei template') }
  }

  function selectTemplate(t: ScoringTemplate) {
    setSelected(t)
    setForm(templateToForm(t))
    setIsNew(false)
    setError(null)
  }

  function startNew() {
    setSelected(null)
    setForm(EMPTY_FORM)
    setIsNew(true)
    setError(null)
  }

  function setWeight(key: WeightKey, value: number) {
    setForm(f => ({ ...f, [key]: Math.max(0, Math.min(100, value)) }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Il nome è obbligatorio'); return }
    const total = form.weightIdentity + form.weightIncome + form.weightStability
                + form.weightDocuments + form.weightGuarantor
    if (total === 0) { setError('Almeno un peso deve essere > 0'); return }

    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await scoringTemplateApi.create(form)
        setTemplates(ts => [...ts, created])
        setSelected(created)
        setIsNew(false)
      } else if (selected) {
        const updated = await scoringTemplateApi.update(selected.id, form)
        setTemplates(ts => ts.map(t => t.id === updated.id ? updated : t))
        setSelected(updated)
      }
    } catch { setError('Errore nel salvataggio') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Eliminare il template "${selected.name}"? L'operazione è irreversibile.`)) return
    setDeleting(true)
    try {
      await scoringTemplateApi.delete(selected.id)
      setTemplates(ts => ts.filter(t => t.id !== selected.id))
      setSelected(null)
      setForm(EMPTY_FORM)
      setIsNew(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore nell\'eliminazione'
      setError(msg)
    } finally { setDeleting(false) }
  }

  const weightKeys = Object.keys(WEIGHT_LABELS) as WeightKey[]
  const total = form.weightIdentity + form.weightIncome + form.weightStability
              + form.weightDocuments + form.weightGuarantor

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-1">Template di scoring</h1>
      <p className="text-sm text-muted-foreground mb-6">
        I template ridistribuiscono i pesi dei 5 fattori nel punteggio forza-tenant.
        Assegna il template a un profilo dal pannello supervisore.
        Quando aggiorni un template, i match di tutti i profili collegati vengono
        ricalcolati in background e ricevi una notifica al termine.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">

        {/* ── Lista template ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                selected?.id === t.id
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : 'hover:bg-accent border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {t.isDefault && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold">DEFAULT</span>}
                <span className="truncate">{t.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t.linkedProfileCount} profil{t.linkedProfileCount === 1 ? 'o' : 'i'} collegat{t.linkedProfileCount === 1 ? 'o' : 'i'}
              </div>
            </button>
          ))}
          <button
            onClick={startNew}
            className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              isNew ? 'bg-primary/10 border-primary text-primary font-medium' : 'border-dashed hover:bg-accent'
            }`}
          >
            + Nuovo template
          </button>
        </div>

        {/* ── Form editor ────────────────────────────────────────────────── */}
        {(selected || isNew) ? (
          <div className="rounded-xl border p-5 space-y-5 bg-card">

            {/* Nome e descrizione */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome template</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="es. Pensionato d'oro"
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrizione (mostrata al supervisore)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Spiega quando usare questo template e perché questi pesi hanno senso…"
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            {/* Sliders pesi */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pesi dei fattori</span>
                <span className="text-xs text-muted-foreground">
                  Totale grezzo: <strong>{total}</strong> → normalizzato a 100%
                </span>
              </div>

              <div className="space-y-4">
                {weightKeys.map(key => {
                  const pct = normalizedPct(form, key)
                  const { label, hint } = WEIGHT_LABELS[key]
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{hint}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0} max={100}
                            value={form[key]}
                            onChange={e => setWeight(key, parseInt(e.target.value) || 0)}
                            className="w-14 text-center text-sm border rounded-lg px-1 py-0.5 bg-background outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <span className="text-xs text-muted-foreground w-10 text-right">({pct}%)</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0} max={100} step={5}
                        value={form[key]}
                        onChange={e => setWeight(key, parseInt(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Barra riepilogativa */}
              {total > 0 && (
                <div className="mt-4 flex rounded-lg overflow-hidden h-4 text-[10px] font-semibold">
                  {weightKeys.map((key, i) => {
                    const pct = normalizedPct(form, key)
                    if (pct === 0) return null
                    const colors = ['bg-blue-400','bg-emerald-400','bg-amber-400','bg-violet-400','bg-rose-400']
                    return (
                      <div
                        key={key}
                        className={`${colors[i]} flex items-center justify-center text-white overflow-hidden`}
                        style={{ width: `${pct}%` }}
                        title={`${WEIGHT_LABELS[key].label}: ${pct}%`}
                      >
                        {pct >= 10 ? `${pct}%` : ''}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Default flag */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm">Template di default (usato quando nessun template è assegnato)</span>
            </label>

            {/* Avviso bulk recalc */}
            {!isNew && selected && selected.linkedProfileCount > 0 && (
              <div className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2">
                ⚠ Questo template è collegato a <strong>{selected.linkedProfileCount}</strong> profil{selected.linkedProfileCount === 1 ? 'o' : 'i'}.
                Salvando, i match verranno ricalcolati in background e riceverai una notifica al termine.
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Azioni */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {saving ? 'Salvataggio…' : isNew ? 'Crea template' : 'Salva modifiche'}
              </button>
              {!isNew && selected && !selected.isDefault && (
                <button
                  onClick={handleDelete}
                  disabled={deleting || selected.linkedProfileCount > 0}
                  title={selected.linkedProfileCount > 0 ? 'Riassegna prima i profili collegati' : 'Elimina template'}
                  className="px-4 py-2 text-sm font-semibold text-destructive border border-destructive/30 rounded-lg disabled:opacity-40 hover:bg-destructive/10 transition-colors"
                >
                  {deleting ? 'Eliminazione…' : 'Elimina'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed flex items-center justify-center text-muted-foreground text-sm h-48">
            Seleziona un template o creane uno nuovo
          </div>
        )}
      </div>
    </div>
  )
}
