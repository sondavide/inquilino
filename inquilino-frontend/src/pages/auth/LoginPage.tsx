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
            <OAuthButtonWip provider="google"   label={t('auth.login.google')} />
            <OAuthButtonWip provider="facebook" label={t('auth.login.facebook')} />
            <OAuthButtonWip provider="linkedin" label={t('auth.login.linkedin')} />

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
              <input
                type="password" placeholder={t('auth.login.password')} value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="current-password"
                className={inputClass}
              />
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

function OAuthButtonWip({ provider, label }: { provider: string; label: string }) {
  const icon = provider === 'google' ? '🔵' : provider === 'facebook' ? '🔷' : '🟦'
  return (
    <div className={cn(
      'w-full flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium',
      'border border-border bg-background opacity-50 cursor-not-allowed select-none'
    )}>
      <span className="flex items-center gap-2"><span>{icon}</span>{label}</span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
        Prossimamente
      </span>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'
const btnClass = cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
)
