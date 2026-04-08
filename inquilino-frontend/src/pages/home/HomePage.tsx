import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n'
import { tenantApi } from '@/api/tenant'
import type { TenantProfileDto } from '@/types'

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ label, value }: { label: string; value: string }) {
  const color =
    value === 'HIGH'   ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    value === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                         'bg-red-100 text-red-700 border-red-200'
  const { t } = useLang()
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
        {t(`score.${value}` as Parameters<typeof t>[0])}
      </span>
      <span className="text-[11px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function ActiveToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  const { t } = useLang()
  return (
    <button
      onClick={() => onChange(!active)}
      className="flex items-center gap-3 w-full rounded-xl border p-4 bg-card"
    >
      <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${active ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className="text-sm font-semibold text-foreground">{t('home.active.label')}</span>
        <span className="text-xs text-muted-foreground">{active ? t('home.active.on') : t('home.active.off')}</span>
      </div>
    </button>
  )
}

// ─── Verification badge ───────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  const { t } = useLang()
  const cfg =
    status === 'VERIFIED'           ? { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: t('home.status.verified') } :
    status === 'PENDING_VALIDATION' ? { cls: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'In validazione'          } :
    status === 'IN_VALIDATION'      ? { cls: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'In revisione'            } :
    status === 'NEEDS_CORRECTION'   ? { cls: 'bg-red-100 text-red-700 border-red-200',             label: 'Da correggere'           } :
    status === 'PARTIAL'            ? { cls: 'bg-amber-100 text-amber-700 border-amber-200',       label: t('home.status.partial')  } :
                                      { cls: 'bg-slate-100 text-slate-500 border-slate-200',        label: t('home.status.none')     }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function Tile({ icon, label, desc, onClick, disabled }: {
  icon: string; label: string; desc: string; onClick?: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-start gap-3 rounded-xl border p-4 w-full text-left bg-card
        transition-colors hover:bg-accent active:scale-[0.98]
        ${disabled ? 'opacity-50 cursor-default' : ''}
      `}
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
    </button>
  )
}

// ─── Tenant — onboarding not completed ───────────────────────────────────────

function TenantOnboardingCTA() {
  const { t }    = useLang()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
      <div className="text-6xl">🏠</div>
      <h1 className="text-xl font-bold text-foreground">{t('home.onboarding.title')}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">{t('home.onboarding.desc')}</p>
      <button
        onClick={() => navigate('/onboarding')}
        className="bg-primary text-primary-foreground font-semibold text-sm px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors w-full max-w-xs"
      >
        {t('home.onboarding.cta')}
      </button>
    </div>
  )
}

// ─── Tenant — dashboard ───────────────────────────────────────────────────────

function TenantDashboard({ initialProfile }: { initialProfile: TenantProfileDto }) {
  const { t }    = useLang()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(initialProfile)

  const handleToggleActive = async (active: boolean) => {
    try {
      await tenantApi.setActive(active)
      setProfile(p => ({ ...p, active }))
    } catch { /* ignore */ }
  }

  const initials = profile.fullName
    ? profile.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : profile.email.slice(0, 2).toUpperCase()

  const displayName = profile.fullName || profile.email

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

          {/* Welcome card */}
          <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('home.welcome')}</p>
              <p className="text-base font-semibold text-foreground truncate">{displayName}</p>
              <VerificationBadge status={profile.verificationStatus} />
            </div>
          </div>

          {/* Completion bar */}
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{t('home.completion')}</span>
              <span className="text-sm font-bold text-primary">{profile.profileCompletion}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${profile.profileCompletion}%` }}
              />
            </div>
          </div>

          {/* Score row */}
          <div className="rounded-xl border bg-card px-4 py-4">
            <div className="flex justify-around gap-2">
              <ScoreBadge label={t('score.rentSustainability')}  value={profile.score.rentSustainability}  />
              <ScoreBadge label={t('score.incomeStability')}     value={profile.score.incomeStability}     />
              <ScoreBadge label={t('score.documentReliability')} value={profile.score.documentReliability} />
            </div>
          </div>

          {/* Active toggle */}
          <ActiveToggle active={profile.active} onChange={handleToggleActive} />

          {/* Action tiles */}
          <div className="space-y-3">
            <Tile
              icon="👤"
              label={t('home.tile.profile')}
              desc={t('home.tile.profile.desc')}
              onClick={() => navigate('/profile')}
            />
            <Tile
              icon="📄"
              label={t('home.tile.documents')}
              desc={t('home.tile.documents.desc')}
              onClick={() => navigate('/profile?tab=documents')}
            />
            <Tile
              icon="📍"
              label={t('home.tile.areas')}
              desc={t('home.tile.areas.desc')}
              onClick={() => navigate('/profile?tab=areas')}
            />
            <Tile
              icon="🏡"
              label={t('home.tile.matching')}
              desc={profile.verificationStatus === 'VERIFIED'
                ? t('matches.tenant.title')
                : t('matches.tenant.not_verified')}
              onClick={() => navigate('/matches')}
            />
          </div>

    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<TenantProfileDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.userType === 'TENANT') {
      tenantApi.getProfile()
        .then(setProfile)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
      Caricamento…
    </div>
  )

  const role = user?.userType ?? ''
  if (role === 'LANDLORD' || role === 'AGENCY') return <Navigate to="/landlord/listings" replace />
  if (role === 'SUPERVISOR') return <Navigate to="/supervisor/profiles" replace />
  if (role === 'SUPERADMIN') return <Navigate to="/admin/supervisors"  replace />

  // Solo TENANT arriva qui
  if (!profile?.onboardingCompleted) return <TenantOnboardingCTA />
  return <TenantDashboard initialProfile={profile} />
}
