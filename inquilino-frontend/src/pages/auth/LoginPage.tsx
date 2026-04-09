import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { setToken } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { registerPushSubscription } from '@/lib/webPush'
import { useLang } from '@/i18n'

type Mode = 'choose' | 'login' | 'register'

export default function LoginPage() {
  const navigate              = useNavigate()
  const { t }                 = useLang()
  const [searchParams]        = useSearchParams()
  const initialMode: Mode     = searchParams.get('register') === 'true' ? 'register' : 'choose'
  const [mode, setMode]       = useState<Mode>(initialMode)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [phone, setPhone]             = useState('')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [consentPrivacy, setConsentPrivacy]     = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)

  const handleOAuth = (provider: string) => {
    window.location.href = `/oauth2/authorization/${provider}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register' && !consentPrivacy) {
      setError(t('auth.consent.required'))
      return
    }
    setLoading(true)
    try {
      const res = mode === 'register'
        ? await authApi.register({ email, password, phone: phone || undefined })
        : await authApi.login({ email, password })
      setToken(res.token)
      registerPushSubscription().catch(() => {})
      navigate('/', { replace: true })
    } catch {
      setError(mode === 'register' ? t('auth.login.error_register') : t('auth.login.error_login'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Back */}
      <div className="px-4 pt-4">
        <Link
          to={initialMode === 'register' ? '/register' : '/'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {initialMode === 'register'
            ? t('auth.back')
            : <><span className="text-base leading-none">←</span> {t('auth.home')}</>
          }
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6">

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">InquilinoFacile</h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'choose'   && t('auth.login.choose')}
              {mode === 'login'    && t('auth.login.login_title')}
              {mode === 'register' && t('auth.login.register_title')}
            </p>
          </div>

          {mode === 'choose' && (
            <div className="space-y-3">
              <OAuthButton provider="google"   label={t('auth.login.google')}   onClick={() => handleOAuth('google')} />
              <OAuthButton provider="facebook" label={t('auth.login.facebook')} onClick={() => handleOAuth('facebook')} />
              <OAuthButton provider="linkedin" label={t('auth.login.linkedin')} onClick={() => handleOAuth('linkedin')} />

              <div className="relative flex items-center py-1">
                <div className="flex-1 border-t border-border" />
                <span className="mx-3 text-xs text-muted-foreground">{t('auth.or')}</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <button onClick={() => setMode('register')} className={btnClass('outline')}>
                {t('auth.login.email_register')}
              </button>
              <button onClick={() => setMode('login')} className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
                {t('auth.login.already')} <span className="underline">{t('auth.login.signin_link')}</span>
              </button>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email" placeholder={t('auth.login.email')} value={email}
                onChange={e => setEmail(e.target.value)} required
                className={inputClass}
              />
              <input
                type="password" placeholder={t('auth.login.password')} value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8}
                className={inputClass}
              />
              {mode === 'register' && (
                <>
                  <input
                    type="tel" placeholder={t('auth.login.phone')} value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={inputClass}
                  />
                  {/* GDPR consent */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox" checked={consentPrivacy}
                        onChange={e => setConsentPrivacy(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
                        required
                      />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        {t('auth.consent.privacy_pre')}{' '}
                        <Link to="/legal/privacy" className="underline text-primary">{t('auth.consent.privacy_link')}</Link>
                        {' '}{t('auth.consent.terms_and')}{' '}
                        <Link to="/legal/terms" className="underline text-primary">{t('auth.consent.terms_link')}</Link>
                        {' '}{t('auth.consent.required_suffix')}
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox" checked={consentMarketing}
                        onChange={e => setConsentMarketing(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
                      />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        {t('auth.consent.profiling')}
                      </span>
                    </label>
                  </div>
                </>
              )}
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading} className={btnClass('primary')}>
                {loading ? t('auth.login.loading') : mode === 'register' ? t('auth.login.submit_register') : t('auth.login.submit_login')}
              </button>
              <button type="button" onClick={() => setMode('choose')}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
                {t('auth.back')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function OAuthButton({ provider, label, onClick }: { provider: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={btnClass('outline')}>
      <span className="mr-2">{providerIcon(provider)}</span>{label}
    </button>
  )
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'
const btnClass = (variant: 'primary' | 'outline') => cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  variant === 'primary'
    ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
    : 'border border-border bg-background hover:bg-accent'
)

function providerIcon(provider: string) {
  if (provider === 'google')   return '🔵'
  if (provider === 'facebook') return '🔷'
  if (provider === 'linkedin') return '🟦'
  return '🔑'
}
