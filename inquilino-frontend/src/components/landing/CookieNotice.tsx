import { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'

const DISMISSED_KEY = 'cookie_notice_dismissed'

export default function CookieNotice() {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) {
      // Small delay so it doesn't flash on first render
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-fade-up">
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3">
        <Cookie className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed flex-1">
          {t('landing.cookie.message')}{' '}
          <Link
            to="/legal/cookie"
            className="text-blue-400 underline underline-offset-2"
          >
            {t('landing.cookie.link')}
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Chiudi avviso cookie"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
