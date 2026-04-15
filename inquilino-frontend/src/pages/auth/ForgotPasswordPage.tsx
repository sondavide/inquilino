import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useLang } from '@/i18n'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const { t } = useLang()
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError(t('auth.forgot.error'))
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-2xl font-bold tracking-tight">{t('auth.forgot.title')}</h1>
            {!sent && (
              <p className="text-muted-foreground text-sm">{t('auth.forgot.desc')}</p>
            )}
          </div>

          {sent ? (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-5 py-5 text-center space-y-3">
              <div className="text-3xl">✉️</div>
              <p className="font-semibold text-green-800 dark:text-green-300">{t('auth.forgot.sent_title')}</p>
              <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                {t('auth.forgot.sent_desc')}
              </p>
              <Link to="/login" className={cn(
                'mt-2 inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90'
              )}>
                {t('auth.forgot.back_login')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder={t('auth.forgot.email_placeholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? t('auth.login.loading') : t('auth.forgot.submit')}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring'
const btnClass = cn(
  'w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
)
