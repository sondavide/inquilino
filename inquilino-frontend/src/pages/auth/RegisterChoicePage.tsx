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

            {/* IDP buttons */}
            <div className="space-y-2">
              <OAuthButton provider="google"   label={t('auth.login.google')}   role={selected} />
              <OAuthButton provider="linkedin" label={t('auth.login.linkedin')} role={selected} />
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

function OAuthButton({ provider, label, role }: { provider: 'google' | 'linkedin'; label: string; role: 'tenant' | 'landlord' }) {
  const url = `/oauth2/authorization/${provider}?role=${role}`
  return (
    <button
      type="button"
      onClick={() => { window.location.href = url }}
      className={cn(
        'w-full flex items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        'border border-slate-200 bg-white hover:bg-slate-50'
      )}
    >
      <ProviderIcon provider={provider} />
      {label}
    </button>
  )
}

function ProviderIcon({ provider }: { provider: 'google' | 'linkedin' }) {
  if (provider === 'google') return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="18" rx="2" fill="#0A66C2"/>
      <path d="M4.5 7h2v7h-2zM5.5 6a1.1 1.1 0 1 1 0-2.2A1.1 1.1 0 0 1 5.5 6zM8 7h1.9v.96C10.2 7.4 10.9 7 11.8 7c1.9 0 2.2 1.25 2.2 2.88V14h-2v-3.7c0-.88-.02-2-.1-2.27-.1-.35-.35-.63-.78-.63-.57 0-.88.38-1.02.75-.05.14-.1.37-.1.64V14H8V7z" fill="white"/>
    </svg>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500'
const btnClass = (variant: 'primary' | 'outline') => cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  variant === 'primary'
    ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
    : 'border border-slate-200 bg-white hover:bg-slate-50'
)
