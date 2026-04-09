import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Globe } from 'lucide-react'
import { useLang } from '@/i18n'

const NAV_ITEMS = [
  { labelKey: 'landing.header.nav_how',      href: '#how-it-works' },
  { labelKey: 'landing.header.nav_search',   href: '#search' },
  { labelKey: 'landing.header.nav_pricing',  href: '#pricing' },
  { labelKey: 'landing.header.nav_faq',      href: '#faq' },
] as const

export default function LandingHeader() {
  const { t, lang, setLang } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">I</span>
          </div>
          <span className={`font-extrabold text-lg tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>
            InquilinoFacile.it
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => scrollTo(item.href)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${scrolled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            >
              {t(item.labelKey as any)}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Lang switcher */}
          <button
            onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${scrolled ? 'text-slate-500 hover:bg-slate-100' : 'text-white/70 hover:bg-white/10'}`}
            aria-label="Cambia lingua"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>

          {/* Login */}
          <Link
            to="/login"
            className={`hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white/90 hover:text-white hover:bg-white/10'}`}
          >
            {t('landing.header.login')}
          </Link>

          {/* Register CTA */}
          <Link
            to="/register"
            className="inline-flex items-center px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/25"
          >
            {t('landing.header.register')}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(p => !p)}
            className={`md:hidden p-2 rounded-lg transition-colors
              ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t(item.labelKey as any)}
              </button>
            ))}
            <div className="pt-3 flex items-center gap-3 border-t border-slate-100">
              <button
                onClick={() => { setLang(lang === 'it' ? 'en' : 'it'); setMenuOpen(false) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
              >
                <Globe className="w-4 h-4" />
                {lang === 'it' ? 'English' : 'Italiano'}
              </button>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              >
                {t('landing.header.login')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
