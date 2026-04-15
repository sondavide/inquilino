import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { setToken } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { registerPushSubscription } from '@/lib/webPush'
import { useLang } from '@/i18n'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t }    = useLang()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      setToken(res.token)
      registerPushSubscription().catch(() => {})
      navigate('/', { replace: true })
    } catch {
      setError(t('auth.login.error_login'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 pt-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span className="text-base leading-none">←</span> {t('auth.home')}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6">

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">InquilinoFacile</h1>
            <p className="text-muted-foreground text-sm">{t('auth.login.login_title')}</p>
          </div>

          <div className="space-y-3">
            <OAuthButton provider="google"   label={t('auth.login.google')} />
            <OAuthButton provider="linkedin" label={t('auth.login.linkedin')} />

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-border" />
              <span className="mx-3 text-xs text-muted-foreground">{t('auth.or')}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email" placeholder={t('auth.login.email')} value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className={inputClass}
              />
              <div className="space-y-1">
                <input
                  type="password" placeholder={t('auth.login.password')} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="current-password"
                  className={inputClass}
                />
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors">
                    {t('auth.forgot.link')}
                  </Link>
                </div>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? t('auth.login.loading') : t('auth.login.submit_login')}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground pt-1">
              {t('auth.login.no_account')}{' '}
              <Link to="/register" className="underline text-foreground font-medium hover:text-primary">
                {t('auth.login.register_link')}
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

function OAuthButton({ provider, label }: { provider: 'google' | 'linkedin'; label: string }) {
  return (
    <button
      type="button"
      onClick={() => { window.location.href = `/oauth2/authorization/${provider}` }}
      className={cn(
        'w-full flex items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        'border border-border bg-background hover:bg-muted'
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

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'
const btnClass = cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
)
