import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const { t } = useLang()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [done, setDone]                   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(t('auth.register.passwords_mismatch'))
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 422) setError(t('auth.reset.invalid_token'))
      else setError(t('auth.reset.error'))
    } finally {
      setLoading(false)
    }
  }

  // Token missing in URL
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-muted-foreground text-sm">{t('auth.reset.token_missing')}</p>
          <Link to="/forgot-password" className={btnClass}>
            {t('auth.forgot.title')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-4 pt-4">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span className="text-base leading-none">←</span> {t('auth.forgot.back_login')}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-6">

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('auth.reset.title')}</h1>
            {!done && (
              <p className="text-muted-foreground text-sm">{t('auth.reset.desc')}</p>
            )}
          </div>

          {done ? (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-5 py-5 text-center space-y-3">
              <div className="text-3xl">✅</div>
              <p className="font-semibold text-green-800 dark:text-green-300">{t('auth.reset.success_title')}</p>
              <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                {t('auth.reset.success_desc')}
              </p>
              <Link to="/login" className={cn(
                'mt-2 inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90'
              )}>
                {t('auth.reset.go_login')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <PasswordInput
                placeholder={t('auth.reset.new_password')}
                value={password} onChange={setPassword}
                show={showPassword} onToggle={() => setShowPassword(v => !v)}
                autoComplete="new-password" minLength={8}
              />
              <PasswordInput
                placeholder={t('auth.reset.confirm_password')}
                value={confirmPassword} onChange={setConfirmPassword}
                show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                autoComplete="new-password"
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? t('auth.login.loading') : t('auth.reset.submit')}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}

function PasswordInput({
  placeholder, value, onChange, show, onToggle, autoComplete, minLength,
}: {
  placeholder: string; value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void
  autoComplete?: string; minLength?: number
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className={inputClass + ' pr-10'}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'
const btnClass = cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
)
