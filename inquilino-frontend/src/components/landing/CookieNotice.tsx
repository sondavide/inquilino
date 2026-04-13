import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'

const CONSENT_KEY = 'cookie_consent'

function grantAnalytics() {
  window.gtag?.('consent', 'update', { analytics_storage: 'granted' })
  localStorage.setItem(CONSENT_KEY, 'granted')
}

function denyAnalytics() {
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  localStorage.setItem(CONSENT_KEY, 'denied')
}

export default function CookieNotice() {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mostra il banner solo se l'utente non ha ancora espresso una scelta
    if (!localStorage.getItem(CONSENT_KEY)) {
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    grantAnalytics()
    setVisible(false)
  }

  const handleDeny = () => {
    denyAnalytics()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-fade-up">
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-4 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            {t('landing.cookie.message')}{' '}
            <Link
              to="/legal/cookie"
              className="text-blue-400 underline underline-offset-2"
            >
              {t('landing.cookie.link')}
            </Link>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDeny}
            className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            {t('landing.cookie.reject')}
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-colors"
          >
            {t('landing.cookie.accept')}
          </button>
        </div>

      </div>
    </div>
  )
}
