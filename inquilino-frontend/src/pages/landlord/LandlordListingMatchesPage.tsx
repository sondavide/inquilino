import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '@/i18n'
import { landlordMatchApi } from '@/api/matching'
import type { TenantProfileCardDto } from '@/types'
import MatchBadge from '@/components/matching/MatchBadge'
import MutualMatchCelebration from '@/components/matching/MutualMatchCelebration'

// ─── Generatore sommario profilo ─────────────────────────────────────────────

function buildProfileSummary(m: TenantProfileCardDto): string {
  const parts: string[] = []

  // Reddito / sostenibilità
  if (m.rentSustainability === 'HIGH') {
    parts.push('Il reddito dichiarato è ampiamente sufficiente a sostenere il canone richiesto.')
  } else if (m.rentSustainability === 'MEDIUM') {
    parts.push('Il reddito dichiarato è sufficiente a coprire il canone, anche se con margine ridotto.')
  } else {
    parts.push('Il reddito dichiarato potrebbe non essere sufficiente a sostenere il canone in modo agevole.')
  }

  // Occupanti
  if (m.occupants === 1) {
    parts.push('Cerca casa per uso personale.')
  } else if (m.occupants === 2) {
    parts.push('Cerca casa per due persone.')
  } else if (m.occupants > 2) {
    parts.push(`Cerca casa per ${m.occupants} persone.`)
  }

  // Fumatore / animali
  const lifestyle: string[] = []
  if (m.smoker)  lifestyle.push('fumatore')
  if (m.hasPets) lifestyle.push('con animali domestici')
  if (lifestyle.length > 0) {
    parts.push(`Ha indicato di essere ${lifestyle.join(' e ')}.`)
  }

  // Affidabilità documenti
  if (m.documentReliability === 'HIGH') {
    parts.push('Ha fornito documentazione completa e verificata a supporto del reddito dichiarato.')
  } else if (m.documentReliability === 'MEDIUM') {
    parts.push('Ha fornito documentazione parziale: il reddito è attestato, ma mancano alcuni documenti storici (es. pagamenti pregressi).')
  } else {
    parts.push('La documentazione fornita è limitata; il reddito dichiarato non è completamente verificabile.')
  }

  // Budget compliance
  if (m.budgetCompliance) {
    if (m.budgetCompliance === 'Compatibile') {
      parts.push('Il budget massimo indicato è compatibile con il canone richiesto.')
    } else if (m.budgetCompliance.startsWith('Vicino')) {
      parts.push('Il budget massimo indicato è leggermente inferiore al canone, ma potrebbe comunque essere negoziabile.')
    } else {
      parts.push('Il budget massimo indicato è al di sotto del canone richiesto.')
    }
  }

  // Stabilità lavorativa
  if (m.incomeStability === 'HIGH') {
    parts.push('La situazione lavorativa risulta stabile.')
  } else if (m.incomeStability === 'MEDIUM') {
    parts.push('La situazione lavorativa presenta una stabilità discreta.')
  } else {
    parts.push('La situazione lavorativa presenta elementi di instabilità.')
  }

  // Garante
  if (m.hasGuarantor) {
    parts.push('Dispone di un garante.')
  }

  // Data disponibilità
  if (m.moveInDate) {
    const d = new Date(m.moveInDate).toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    parts.push(`Cerca disponibilità a partire dal ${d}.`)
  }

  return parts.join(' ')
}

// ─── Lookup tables ────────────────────────────────────────────────────────────

const OCCUPATION: Record<string, string> = {
  EMPLOYEE: 'Dipendente', SELF_EMPLOYED: 'Autonomo', STUDENT: 'Studente',
  RETIRED: 'Pensionato', OTHER: 'Altro',
}

const INCOME_BAND: Record<string, { label: string; color: string }> = {
  '0–1200':    { label: 'Reddito basso',       color: 'bg-red-100 text-red-700' },
  '1200–1800': { label: 'Reddito medio-basso',  color: 'bg-amber-100 text-amber-700' },
  '1800–2500': { label: 'Reddito medio',        color: 'bg-yellow-100 text-yellow-700' },
  '2500–3500': { label: 'Reddito medio-alto',   color: 'bg-emerald-100 text-emerald-700' },
  '3500+':     { label: 'Reddito alto',         color: 'bg-emerald-100 text-emerald-800' },
}

const DOT: Record<string, string> = {
  HIGH: 'bg-emerald-500', MEDIUM: 'bg-amber-500', LOW: 'bg-red-400',
}

const DOT_LABEL: Record<string, string> = {
  HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Bassa',
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
      {children}
    </span>
  )
}

function ScoreRow({ val, label }: { val: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[val] ?? 'bg-gray-300'}`} />
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <span className="text-sm font-medium text-gray-900">{DOT_LABEL[val] ?? val}</span>
    </div>
  )
}

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({
  m,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryDisabled,
  secondaryDisabled,
}: {
  m:                 TenantProfileCardDto
  primaryLabel:      string
  secondaryLabel:    string
  onPrimary:         () => void
  onSecondary:       () => void
  primaryDisabled?:  boolean
  secondaryDisabled?: boolean
}) {
  const incomeBand = m.incomeRange ? INCOME_BAND[m.incomeRange] : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-gray-400 mb-1">{m.profileCode}</p>
          <div className="flex flex-wrap gap-1">
            {m.ageRange && <Tag>{m.ageRange} anni</Tag>}
            {m.occupationCategory && (
              <Tag>{OCCUPATION[m.occupationCategory] ?? m.occupationCategory}</Tag>
            )}
            <Tag>👥 {m.occupants} {m.occupants === 1 ? 'persona' : 'persone'}</Tag>
          </div>
        </div>
        <MatchBadge band={m.matchBand} size="sm" />
      </div>

      {/* ── Chips reddito / budget / garante ──────────────────────────────── */}
      <div className="px-5 pb-4 flex flex-wrap gap-1.5">
        {incomeBand && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${incomeBand.color}`}>
            {incomeBand.label}
          </span>
        )}
        {m.budgetCompliance && (() => {
          const ok   = m.budgetCompliance === 'Compatibile'
          const warn = m.budgetCompliance.startsWith('Vicino')
          return (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              ok ? 'bg-emerald-100 text-emerald-700' :
              warn ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              💰 {m.budgetCompliance}
            </span>
          )
        })()}
        {m.hasGuarantor && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
            Garante ✓
          </span>
        )}
        {m.hasPets && (
          <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full">
            🐾 Animali
          </span>
        )}
        {m.smoker && (
          <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full">
            🚬 Fumatore
          </span>
        )}
        {m.moveInDate && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
            📅 {new Date(m.moveInDate).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>

      {/* ── Sommario profilo ──────────────────────────────────────────────── */}
      {(() => {
        const summary = m.profileSummary ?? buildProfileSummary(m)
        return (
          <div className="mx-5 mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Profilo inquilino
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </div>
        )
      })()}

      {/* ── Analisi compatibilità (AI) ────────────────────────────────────── */}
      {m.matchSummary && (
        <div className="mx-5 mb-4 bg-blue-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
            <span>🤖</span> Compatibilità con questo annuncio
          </p>
          <p className="text-blue-800 text-xs leading-relaxed">{m.matchSummary}</p>
        </div>
      )}

      {/* ── Valutazione ───────────────────────────────────────────────────── */}
      {m.recommendation && (
        <div className={`mx-5 mb-4 rounded-xl p-3 ${
          m.matchBand === 'EXCELLENT_MATCH' ? 'bg-emerald-50' :
          m.matchBand === 'GOOD_MATCH'      ? 'bg-blue-50'    :
          m.matchBand === 'MEDIUM_MATCH'    ? 'bg-amber-50'   : 'bg-gray-50'
        }`}>
          <p className="text-xs font-semibold text-gray-700 mb-1">💡 Valutazione</p>
          <p className="text-xs text-gray-800 leading-relaxed">{m.recommendation}</p>
        </div>
      )}

      {/* ── Score indicators ──────────────────────────────────────────────── */}
      <div className="px-5 pb-5 space-y-2">
        <ScoreRow val={m.rentSustainability}  label="Sostenibilità affitto" />
        <ScoreRow val={m.incomeStability}     label="Stabilità reddito" />
        <ScoreRow val={m.documentReliability} label="Affidabilità documenti" />
      </div>

      {/* ── Contatti sbloccati ────────────────────────────────────────────── */}
      {m.matchState === 'CONTACT_UNLOCKED' && (
        <div className="mx-5 mb-5 bg-emerald-50 rounded-xl p-4 space-y-1">
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <span>🔓</span> Contatti sbloccati
          </p>
          {m.fullName && <p className="text-sm font-medium text-gray-800">{m.fullName}</p>}
          {m.email && (
            <a href={`mailto:${m.email}`} className="text-sm text-blue-600 block">{m.email}</a>
          )}
          {m.phone && (
            <a href={`tel:${m.phone}`} className="text-sm text-blue-600 block">{m.phone}</a>
          )}
        </div>
      )}

      {/* ── Buttons ───────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
        <button
          onClick={onSecondary}
          disabled={secondaryDisabled}
          className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-sm
                     hover:bg-gray-50 active:scale-95 transition disabled:opacity-50"
        >
          {secondaryLabel}
        </button>
        <button
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm
                     hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LandlordListingMatchesPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigate      = useNavigate()
  const { t }         = useLang()

  const [tab,           setTab]           = useState<'discover' | 'mutual'>('discover')
  const [queue,         setQueue]         = useState<TenantProfileCardDto[]>([])
  const [hadCards,      setHadCards]      = useState(false)
  const [mutuals,       setMutuals]       = useState<TenantProfileCardDto[]>([])
  const [loading,       setLoading]       = useState(true)
  const [mutualLoading, setMutualLoading] = useState(false)
  const [actionLoading,   setActionLoading]   = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [page,          setPage]          = useState(0)
  const [hasMore,       setHasMore]       = useState(false)

  const PENDING_STATES = ['ALGORITHMIC', 'TENANT_INTERESTED']

  const loadQueue = useCallback((p = 0) => {
    if (!listingId) return
    setLoading(true)
    landlordMatchApi.list(listingId, p)
      .then(res => {
        const pending = res.content.filter(m => PENDING_STATES.includes(m.matchState))
        setQueue(prev => p === 0 ? pending : [...prev, ...pending])
        setHasMore((p + 1) < res.totalPages)
        setPage(p)
        if (pending.length > 0) setHadCards(true)
      })
      .finally(() => setLoading(false))
  }, [listingId])

  const loadMutuals = useCallback(() => {
    if (!listingId) return
    setMutualLoading(true)
    landlordMatchApi.listMutual(listingId)
      .then(setMutuals)
      .finally(() => setMutualLoading(false))
  }, [listingId])

  useEffect(() => { loadQueue(0) }, [loadQueue])
  useEffect(() => { if (tab === 'mutual') loadMutuals() }, [tab, loadMutuals])

  const card = queue[0] ?? null

  const advance = () => {
    setQueue(q => {
      const next = q.slice(1)
      if (next.length <= 3 && hasMore) loadQueue(page + 1)
      return next
    })
  }

  const handleInvite = async () => {
    if (!card || !listingId) return
    setActionLoading(true)
    try {
      const u = await landlordMatchApi.invite(listingId, card.matchId)
      if (u.matchState === 'MUTUAL_INTEREST') setShowCelebration(true)
    }
    catch { /* ignore */ }
    finally { setActionLoading(false) }
    advance()
  }

  const handleSkip = async () => {
    if (!card || !listingId) return
    setActionLoading(true)
    try { await landlordMatchApi.dismiss(listingId, card.matchId) } catch { /* ignore */ }
    finally { setActionLoading(false) }
    advance()
  }

  const handleUnlock = async (m: TenantProfileCardDto) => {
    if (!listingId) return
    setActionLoading(true)
    try {
      const updated = await landlordMatchApi.unlockContact(listingId, m.matchId)
      setMutuals(ms => ms.map(x => x.matchId === updated.matchId ? updated : x))
    } catch { /* ignore */ }
    finally { setActionLoading(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    {showCelebration && (
      <MutualMatchCelebration onDone={() => setShowCelebration(false)} />
    )}
    <div className="h-full flex flex-col bg-gray-50">

      {/* Sub-header con tabs */}
      <div className="bg-white border-b px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-center gap-3 mb-3 max-w-7xl mx-auto">
          <button onClick={() => navigate('/landlord/listings')} className="text-sm text-blue-600">
            ← {t('matches.landlord.back' as any)}
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1">
            {t('matches.landlord.title' as any)}
          </h1>
        </div>
        <div className="flex max-w-7xl mx-auto">
          {(['discover', 'mutual'] as const).map(t_ => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === t_
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t_ === 'discover' ? '👤 Profili' : '💚 Reciproci'}
              {t_ === 'mutual' && mutuals.length > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 rounded-full">
                  {mutuals.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-7xl mx-auto">

          {/* ── Discover tab ───────────────────────────────────────────────── */}
          {tab === 'discover' && (
            <>
              {loading && queue.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  {t('matches.landlord.loading' as any)}
                </p>
              )}

              {!loading && !card && !hadCards && (
                <div className="bg-white border rounded-2xl p-8 text-center space-y-2">
                  <p className="text-4xl">👥</p>
                  <p className="font-semibold text-gray-700">{t('matches.landlord.empty' as any)}</p>
                </div>
              )}

              {!loading && !card && hadCards && (
                <div className="text-center py-16 space-y-2">
                  <p className="text-4xl">✅</p>
                  <p className="font-semibold text-gray-700">Hai esaminato tutti i profili!</p>
                  <p className="text-sm text-gray-500">Controlla i match reciproci nella tab "Reciproci"</p>
                </div>
              )}

              {card && (
                <div className="max-w-2xl mx-auto space-y-3">
                  {/* Progresso */}
                  <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                    <span>{queue.length}{hasMore ? '+' : ''} {queue.length === 1 ? 'profilo rimanente' : 'profili rimanenti'}</span>
                  </div>

                  <ProfileCard
                    m={card}
                    primaryLabel="Invita"
                    secondaryLabel="Salta"
                    onPrimary={handleInvite}
                    onSecondary={handleSkip}
                    primaryDisabled={actionLoading}
                    secondaryDisabled={actionLoading}
                  />
                </div>
              )}
            </>
          )}

          {/* ── Mutual tab ─────────────────────────────────────────────────── */}
          {tab === 'mutual' && (
            <>
              {mutualLoading && (
                <p className="text-center text-gray-400 text-sm py-8">Caricamento…</p>
              )}

              {!mutualLoading && mutuals.length === 0 && (
                <div className="text-center py-16 space-y-2">
                  <p className="text-4xl">💚</p>
                  <p className="font-semibold text-gray-700">Nessun match reciproco ancora</p>
                  <p className="text-sm text-gray-500">
                    Quando un inquilino ricambia il tuo interesse, appare qui
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {mutuals.map(m => (
                  <ProfileCard
                    key={m.matchId}
                    m={m}
                    primaryLabel={
                      m.matchState === 'CONTACT_UNLOCKED' ? '✓ Contatti sbloccati' : '🔓 Sblocca contatti'
                    }
                    secondaryLabel="Ignora"
                    onPrimary={() => {
                      if (m.matchState !== 'CONTACT_UNLOCKED') handleUnlock(m)
                    }}
                    onSecondary={() =>
                      setMutuals(ms => ms.filter(x => x.matchId !== m.matchId))
                    }
                    primaryDisabled={actionLoading || m.matchState === 'CONTACT_UNLOCKED'}
                    secondaryDisabled={actionLoading}
                  />
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
    </>
  )
}
