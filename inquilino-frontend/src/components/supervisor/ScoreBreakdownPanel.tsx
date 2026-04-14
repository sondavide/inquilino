import { useEffect, useState } from 'react'
import { supervisorApi } from '@/api/supervisor'
import type { ScoreBreakdownDto, ScoreLevel, DocLine } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelColor(l: ScoreLevel | null | undefined) {
  if (l === 'HIGH')   return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (l === 'MEDIUM') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

function levelLabel(l: ScoreLevel | null | undefined) {
  if (l === 'HIGH')   return 'ALTA'
  if (l === 'MEDIUM') return 'MEDIA'
  return 'BASSA'
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return '—'
  return `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function FactorBar({ label, pts, max, expl }: { label: string; pts: number; max: number; expl: string }) {
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{pts}/{max} pt</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">{expl}</p>
    </div>
  )
}

function DocScoreLine({ line }: { line: DocLine }) {
  const docLabels: Record<string, string> = {
    IDENTITY: 'Documento identità',
    PAYSLIP: 'Busta paga',
    PAYSLIP_TRIPLE_BONUS: 'Bonus 3 buste paga',
    TAX_RETURN: '730 / CU',
    EMPLOYMENT_CONTRACT: 'Contratto lavoro',
    BANK_STATEMENT: 'Estratto conto',
    LANDLORD_REFERENCE: 'Referenza locatore',
    GUARANTOR_DOCUMENT: 'Doc. garante',
  }
  return (
    <div className={`flex items-center justify-between py-1.5 text-xs border-b last:border-0 ${
      line.isBonus ? 'italic text-muted-foreground' : ''
    }`}>
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
          line.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
        }`}>
          {line.approved ? '✓' : '✗'}
        </span>
        <span>{docLabels[line.type] ?? line.type}</span>
        {line.count > 0 && <span className="text-muted-foreground">×{line.count}</span>}
      </div>
      <div className="flex items-center gap-1 text-right">
        <span className={line.approved ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
          +{line.pointsEarned}
        </span>
        <span className="text-muted-foreground">/{line.maxPoints}</span>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreBreakdownPanel({ profileId }: { profileId: string }) {
  const [data,    setData]    = useState<ScoreBreakdownDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    supervisorApi.getScoreBreakdown(profileId)
      .then(setData)
      .catch(() => setError('Errore nel caricamento del breakdown'))
      .finally(() => setLoading(false))
  }, [profileId])

  if (loading) return <div className="text-sm text-muted-foreground py-4 text-center">Calcolo in corso…</div>
  if (error)   return <div className="text-sm text-destructive py-4">{error}</div>
  if (!data)   return null

  const { rent, income, docs, suggestions,
          overrideRentSustainability, overrideIncomeStability, overrideDocumentReliability, overrideReason } = data

  return (
    <div className="space-y-6">

      {/* Override attivo */}
      {(overrideRentSustainability || overrideIncomeStability || overrideDocumentReliability) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-700 mb-1">Override attivo</p>
          {overrideReason && <p className="text-amber-600 text-xs">{overrideReason}</p>}
        </div>
      )}

      {/* ── Sostenibilità canone ────────────────────────────────────────────── */}
      <section className="rounded-xl border p-4 space-y-3 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Sostenibilità canone</h3>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            levelColor(overrideRentSustainability ?? rent.level)}`}>
            {levelLabel(overrideRentSustainability ?? rent.level)}
            {overrideRentSustainability && <span className="ml-1 opacity-60">(override)</span>}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div><span className="text-muted-foreground">Reddito dichiarato</span><br/><span className="font-medium">{fmtEur(rent.declaredIncome)}</span></div>
          <div><span className="text-muted-foreground">Reddito verificato</span><br/>
            <span className={`font-medium ${rent.verifiedIncome ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {rent.verifiedIncome ? fmtEur(rent.verifiedIncome) : '— non verificato'}
            </span>
          </div>
          <div><span className="text-muted-foreground">Credito garante ({Math.round((rent.guarantorCredit ?? 0) / Math.max(rent.guarantorTotalIncome ?? 1, 1) * 100) || 0}%)</span><br/><span className="font-medium">{fmtEur(rent.guarantorCredit)}</span></div>
          <div><span className="text-muted-foreground">Reddito effettivo</span><br/><span className="font-semibold">{fmtEur(rent.effectiveIncome)}</span></div>
          <div><span className="text-muted-foreground">Affitto max</span><br/><span className="font-medium">{fmtEur(rent.maxBudget)}</span></div>
          <div><span className="text-muted-foreground">Ratio</span><br/>
            <span className={`font-semibold ${levelColor(rent.level).split(' ')[1]}`}>
              {rent.ratioPercent != null ? `${rent.ratioPercent.toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground border-t pt-2">{rent.explanation}</p>
      </section>

      {/* ── Stabilità reddituale ────────────────────────────────────────────── */}
      <section className="rounded-xl border p-4 space-y-3 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Stabilità reddituale</h3>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            levelColor(overrideIncomeStability ?? income.level)}`}>
            {levelLabel(overrideIncomeStability ?? income.level)}
            {overrideIncomeStability && <span className="ml-1 opacity-60">(override)</span>}
          </span>
        </div>

        <div className="space-y-3">
          <FactorBar label="A — Base occupazione" pts={income.factorA} max={45} expl={income.factorAExplanation} />
          <FactorBar label="B — Continuità"        pts={income.factorB} max={25} expl={income.factorBExplanation} />
          <FactorBar label="C — Verifica reddito"  pts={income.factorC} max={20} expl={income.factorCExplanation} />
          <FactorBar label="D — Rete di sicurezza" pts={income.factorD} max={10} expl={income.factorDExplanation} />
        </div>

        {income.isStudent && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 px-3 py-2 text-xs space-y-1">
            <p className="font-semibold text-blue-700">Studente: formula combinata</p>
            <p>Own score: <strong>{income.totalScore}</strong> × {100 - (income.familyWeightPct ?? 70)}%</p>
            {income.familyScore != null ? (
              <p>Family score: <strong>{income.familyScore}</strong> × {income.familyWeightPct}%
                {income.familyExplanation && <span className="block text-muted-foreground">{income.familyExplanation}</span>}
              </p>
            ) : (
              <p className="text-amber-600">Nessun dato garante familiare → famiglia non calcolata</p>
            )}
            {income.combinedScore != null && (
              <p className="font-semibold">Combined: <span className={levelColor(income.level).split(' ')[1]}>{income.combinedScore}/100</span></p>
            )}
          </div>
        )}

        {!income.isStudent && (
          <div className="flex justify-between text-xs border-t pt-2">
            <span className="font-semibold">Totale</span>
            <span className="font-bold">{income.totalScore}/100</span>
          </div>
        )}
      </section>

      {/* ── Affidabilità documentale ────────────────────────────────────────── */}
      <section className="rounded-xl border p-4 space-y-3 bg-card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Affidabilità documentale</h3>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            levelColor(overrideDocumentReliability ?? docs.level)}`}>
            {levelLabel(overrideDocumentReliability ?? docs.level)}
            {overrideDocumentReliability && <span className="ml-1 opacity-60">(override)</span>}
          </span>
        </div>

        <div className="divide-y">
          {docs.lines.map((l, i) => <DocScoreLine key={i} line={l} />)}
        </div>

        <div className="flex justify-between text-xs border-t pt-2">
          <span className="font-semibold">Totale</span>
          <span className="font-bold">{docs.totalScore}/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            docs.level === 'HIGH' ? 'bg-emerald-400' : docs.level === 'MEDIUM' ? 'bg-amber-400' : 'bg-red-400'
          }`} style={{ width: `${docs.totalScore}%` }} />
        </div>
      </section>

      {/* ── Suggerimenti ────────────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
          <h3 className="font-semibold text-sm text-blue-700">Azioni che migliorano il profilo</h3>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded font-semibold border ${levelColor(s.projectedLevel)}`}>
                → {levelLabel(s.projectedLevel)}
              </span>
              <span className="text-muted-foreground leading-relaxed">
                {s.action}
                {s.estimatedPointGain && <span className="ml-1 text-emerald-600 font-semibold">(+{s.estimatedPointGain} pt)</span>}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
