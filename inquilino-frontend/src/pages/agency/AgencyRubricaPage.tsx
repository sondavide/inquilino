import { useEffect, useState } from 'react'
import { getAgencyRubrica } from '@/api/agency'
import type { TenantProfileCardDto } from '@/types'
import { useLang } from '@/i18n'

const LEVEL_COLOR: Record<string, string> = {
  HIGH:   'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-red-100 text-red-700',
}

function ScoreBadge({ level, label }: { level: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[level] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}: {level === 'HIGH' ? 'Alta' : level === 'MEDIUM' ? 'Media' : 'Bassa'}
    </span>
  )
}

function ProfileCard({ m }: { m: TenantProfileCardDto }) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState(false)
  const isUnlocked = m.matchState === 'CONTACT_UNLOCKED'

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">
              {isUnlocked && m.fullName ? m.fullName : `Profilo ${m.profileCode}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {m.ageRange} · {m.occupationCategory ?? '—'} · {m.occupants} occ.
              {m.hasPets && ' · 🐾'}{m.smoker && ' · 🚬'}
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
            m.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {m.verificationStatus === 'VERIFIED' ? t('agency.rubrica.verified') : m.verificationStatus}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <ScoreBadge level={m.rentSustainability}  label="Sostenibilità" />
          <ScoreBadge level={m.incomeStability}      label="Stabilità" />
          <ScoreBadge level={m.documentReliability}  label="Documenti" />
          {m.hasGuarantor && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Con garante</span>
          )}
        </div>

        {m.moveInDate && (
          <p className="text-xs text-muted-foreground">
            Disponibile dal {new Date(m.moveInDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

        {isUnlocked && (m.email || m.phone) && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm space-y-1">
            {m.email && <p className="text-emerald-800">📧 {m.email}</p>}
            {m.phone && <p className="text-emerald-800">📞 {m.phone}</p>}
          </div>
        )}

        {(m.matchSummary || m.profileSummary) && (
          <button onClick={() => setExpanded(v => !v)}
            className="text-xs text-violet-600 hover:text-violet-700 transition-colors">
            {expanded ? t('agency.rubrica.hide_summary') : t('agency.rubrica.show_summary')}
          </button>
        )}
        {expanded && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3">
            {m.matchSummary || m.profileSummary}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AgencyRubricaPage() {
  const { t } = useLang()
  const [profiles, setProfiles] = useState<TenantProfileCardDto[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    getAgencyRubrica()
      .then(setProfiles)
      .catch(() => setError(t('agency.rubrica.error')))
      .finally(() => setLoading(false))
  }, [])

  const filtered = profiles.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.profileCode.toLowerCase().includes(q) ||
      (p.fullName?.toLowerCase().includes(q)) ||
      (p.occupationCategory?.toLowerCase().includes(q))
    )
  })

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{t('agency.rubrica.loading')}</div>
  )

  return (
    <div className="px-4 py-6 w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t('agency.rubrica.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('agency.rubrica.subtitle')}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {profiles.length > 0 && (
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('agency.rubrica.search_placeholder')}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-background"
        />
      )}

      {profiles.length === 0 && (
        <div className="text-center py-14 text-muted-foreground">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-medium">{t('agency.rubrica.empty_title')}</p>
          <p className="text-xs mt-1">{t('agency.rubrica.empty_hint')}</p>
        </div>
      )}

      {filtered.length === 0 && profiles.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          {t('agency.rubrica.no_results', { q: search })}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map(m => (
          <ProfileCard key={m.matchId} m={m} />
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {t('agency.rubrica.count', { n: filtered.length, s: filtered.length !== 1 ? 'i' : 'o' })}
        </p>
      )}
    </div>
  )
}
