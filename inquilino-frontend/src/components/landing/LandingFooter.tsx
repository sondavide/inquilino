import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'

export default function LandingFooter() {
  const { t } = useLang()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-white">
      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">I</span>
              </div>
              <span className="font-extrabold text-lg">InquilinoFacile.it</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              {t('landing.footer.tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-300 uppercase tracking-wider">
              {t('landing.footer.col_product')}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t('landing.footer.link_how'),     href: '#how-it-works' },
                { label: t('landing.footer.link_search'),  href: '#search' },
                { label: t('landing.footer.link_pricing'), href: '#pricing' },
                { label: t('landing.footer.link_faq'),     href: '#faq' },
              ].map(item => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    onClick={e => { e.preventDefault(); document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' }) }}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-300 uppercase tracking-wider">
              {t('landing.footer.col_legal')}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t('landing.footer.link_privacy'), to: '/legal/privacy' },
                { label: t('landing.footer.link_cookie'),  to: '/legal/cookie' },
                { label: t('landing.footer.link_terms'),   to: '/legal/terms' },
              ].map(item => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sm mb-4 text-slate-300 uppercase tracking-wider">
              {t('landing.footer.col_contact')}
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:privacy@inquilinofacile.it"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  privacy@inquilinofacile.it
                </a>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {t('landing.header.login')}
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {t('landing.header.register')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">
            {t('landing.footer.copyright' as any, { year })}
          </p>
          <p className="text-slate-600 text-xs">
            {t('landing.footer.gdpr')}
          </p>
        </div>
      </div>
    </footer>
  )
}
