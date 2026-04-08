import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { setToken } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { registerPushSubscription } from '@/lib/webPush'

type Mode = 'choose' | 'login' | 'register'

export default function LoginPage() {
  const navigate              = useNavigate()
  const [searchParams]        = useSearchParams()
  const initialMode: Mode     = searchParams.get('register') === 'true' ? 'register' : 'choose'
  const [mode, setMode]       = useState<Mode>(initialMode)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone]       = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleOAuth = (provider: string) => {
    window.location.href = `/oauth2/authorization/${provider}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'register'
        ? await authApi.register({ email, password, phone: phone || undefined })
        : await authApi.login({ email, password })
      setToken(res.token)
      registerPushSubscription().catch(() => {})
      navigate('/', { replace: true })
    } catch {
      setError(mode === 'register' ? 'Registrazione fallita. Email già in uso?' : 'Credenziali non valide.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Inquilino</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'choose'   && 'Come vuoi continuare?'}
            {mode === 'login'    && 'Accedi al tuo account'}
            {mode === 'register' && 'Crea un account'}
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            <OAuthButton provider="google"   label="Continua con Google"   onClick={() => handleOAuth('google')} />
            <OAuthButton provider="facebook" label="Continua con Facebook" onClick={() => handleOAuth('facebook')} />
            <OAuthButton provider="linkedin" label="Continua con LinkedIn" onClick={() => handleOAuth('linkedin')} />

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-border" />
              <span className="mx-3 text-xs text-muted-foreground">oppure</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <button onClick={() => setMode('register')} className={btnClass('outline')}>
              Registrati con email
            </button>
            <button onClick={() => setMode('login')} className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
              Hai già un account? <span className="underline">Accedi</span>
            </button>
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className={inputClass}
            />
            <input
              type="password" placeholder="Password (min. 8 caratteri)" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8}
              className={inputClass}
            />
            {mode === 'register' && (
              <input
                type="tel" placeholder="Telefono (opzionale)" value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
              />
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={btnClass('primary')}>
              {loading ? 'Attendere…' : mode === 'register' ? 'Crea account' : 'Accedi'}
            </button>
            <button type="button" onClick={() => setMode('choose')}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
              ← Indietro
            </button>
          </form>
        )}
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
