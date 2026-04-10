import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Home, Key, Building2, ArrowLeft } from 'lucide-react'
import { authApi } from '@/api/auth'
import { setToken } from '@/hooks/useAuth'
import { registerPushSubscription } from '@/lib/webPush'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n'
import AgencyContactModal from '@/components/landing/AgencyContactModal'

type SelectedType = null | 'tenant' | 'landlord'

const CARDS = [
  {
    id: 'tenant' as const,
    icon: Key,
    color: 'from-blue-500 to-violet-500',
    bg: 'hover:border-blue-300 hover:shadow-blue-100',
    titleKey: 'auth.choice.tenant.title',
    descKey:  'auth.choice.tenant.desc',
    ctaKey:   'auth.choice.tenant.cta',
  },
  {
    id: 'landlord' as const,
    icon: Home,
    color: 'from-emerald-500 to-teal-500',
    bg: 'hover:border-emerald-300 hover:shadow-emerald-100',
    titleKey: 'auth.choice.landlord.title',
    descKey:  'auth.choice.landlord.desc',
    ctaKey:   'auth.choice.landlord.cta',
  },
]

export default function RegisterChoicePage() {
  const { t }    = useLang()
  const navigate = useNavigate()

  const [selected, setSelected]           = useState<SelectedType>(null)
  const [showAgencyModal, setShowAgencyModal] = useState(false)

  // Tenant registration form state
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [phone, setPhone]         = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [consentPrivacy, setConsentPrivacy]     = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)

  const handleTenantRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consentPrivacy) { setError(t('auth.consent.required')); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({ email, password, phone: phone || undefined })
      setToken(res.token)
      registerPushSubscription().catch(() => {})
      navigate('/', { replace: true })
    } catch {
      setError(t('auth.login.error_register'))
    } finally {
      setLoading(false)
    }
  }

  const back = () => {
    setSelected(null)
    setError('')
    setEmail('')
    setPassword('')
    setPhone('')
    setConsentPrivacy(false)
    setConsentMarketing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col px-4 py-6">

      {/* Back */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <span className="text-base leading-none">←</span> {t('auth.home')}
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-8">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">I</span>
          </div>
          <span className="font-extrabold text-lg text-slate-900">InquilinoFacile.it</span>
        </Link>

        {/* ── Type selection ── */}
        {selected === null && (
          <div className="w-full max-w-3xl">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-extrabold text-slate-900">{t('auth.choice.title')}</h1>
              <p className="mt-2 text-slate-500">{t('auth.choice.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {CARDS.map((c) => {
                const Icon = c.icon
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)} className="h-full text-left">
                    <div className={`group h-full flex flex-col bg-white rounded-3xl border-2 border-slate-100 p-7 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer ${c.bg}`}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-5`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="font-bold text-slate-900 text-lg mb-2">{t(c.titleKey as any)}</h2>
                      <p className="text-slate-500 text-sm leading-relaxed flex-1">{t(c.descKey as any)}</p>
                      <div className={`mt-6 flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>
                        {t(c.ctaKey as any)}
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                )
              })}

              {/* Agency card */}
              <button onClick={() => setShowAgencyModal(true)} className="h-full text-left">
                <div className="group h-full flex flex-col bg-white rounded-3xl border-2 border-slate-100 p-7 shadow-sm hover:shadow-lg hover:border-violet-300 hover:shadow-violet-100 transition-all duration-200 cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-5">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="font-bold text-slate-900 text-lg mb-2">{t('auth.choice.agency.title' as any)}</h2>
                  <p className="text-slate-500 text-sm leading-relaxed flex-1">{t('auth.choice.agency.desc' as any)}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                    {t('auth.choice.agency.cta' as any)}
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-slate-400 mt-8">
              {t('auth.choice.already')}{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">{t('auth.login.signin_link')}</Link>
            </p>
          </div>
        )}

        {/* ── Registration panel (tenant or landlord) ── */}
        {selected !== null && (
          <div className="w-full max-w-sm space-y-5">

            <button onClick={back}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Cambia tipo di profilo
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {selected === 'tenant' ? t('auth.login.register_title') : 'Registrati come locatore'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {selected === 'tenant'
                  ? 'Crea il tuo profilo affidabilità e trova casa più facilmente.'
                  : 'Pubblica i tuoi immobili e trova inquilini verificati.'}
              </p>
            </div>

            {/* IDP buttons — WIP */}
            <div className="space-y-2">
              <OAuthButtonWip provider="google"   label={t('auth.login.google')} />
              <OAuthButtonWip provider="facebook" label={t('auth.login.facebook')} />
              <OAuthButtonWip provider="linkedin" label={t('auth.login.linkedin')} />
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="mx-3 text-xs text-slate-400">{t('auth.or')}</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Tenant: inline email form */}
            {selected === 'tenant' && (
              <form onSubmit={handleTenantRegister} className="space-y-3">
                <input
                  type="email" placeholder={t('auth.login.email')} value={email}
                  onChange={e => setEmail(e.target.value)} required autoComplete="email"
                  className={inputClass}
                />
                <input
                  type="password" placeholder={t('auth.login.password')} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                  className={inputClass}
                />
                <input
                  type="tel" placeholder={t('auth.login.phone')} value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={inputClass}
                />
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={consentPrivacy}
                      onChange={e => setConsentPrivacy(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary shrink-0" />
                    <span className="text-xs text-slate-500 leading-relaxed">
                      {t('auth.consent.privacy_pre')}{' '}
                      <Link to="/legal/privacy" className="underline text-primary">{t('auth.consent.privacy_link')}</Link>
                      {' '}{t('auth.consent.terms_and')}{' '}
                      <Link to="/legal/terms" className="underline text-primary">{t('auth.consent.terms_link')}</Link>
                      {' '}{t('auth.consent.required_suffix')}
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={consentMarketing}
                      onChange={e => setConsentMarketing(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary shrink-0" />
                    <span className="text-xs text-slate-500 leading-relaxed">
                      {t('auth.consent.profiling')}
                    </span>
                  </label>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className={btnClass('primary')}>
                  {loading ? t('auth.login.loading') : t('auth.login.submit_register')}
                </button>
              </form>
            )}

            {/* Landlord: navigate to full wizard */}
            {selected === 'landlord' && (
              <Link to="/register/landlord" className={btnClass('primary')}>
                {t('auth.login.email_register')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            )}

            <p className="text-center text-sm text-slate-400">
              {t('auth.choice.already')}{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">{t('auth.login.signin_link')}</Link>
            </p>
          </div>
        )}

      </div>

      {showAgencyModal && <AgencyContactModal onClose={() => setShowAgencyModal(false)} />}
    </div>
  )
}

function OAuthButtonWip({ provider, label }: { provider: string; label: string }) {
  return (
    <div className={cn(
      'w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium',
      'border border-slate-200 bg-white opacity-50 cursor-not-allowed select-none'
    )}>
      <span className="flex items-center gap-2">
        <span>{providerIcon(provider)}</span>{label}
      </span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
        Prossimamente
      </span>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500'
const btnClass = (variant: 'primary' | 'outline') => cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  variant === 'primary'
    ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
    : 'border border-slate-200 bg-white hover:bg-slate-50'
)

function providerIcon(provider: string) {
  if (provider === 'google')   return '🔵'
  if (provider === 'facebook') return '🔷'
  if (provider === 'linkedin') return '🟦'
  return '🔑'
}
