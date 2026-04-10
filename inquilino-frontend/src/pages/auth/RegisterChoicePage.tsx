import { Link } from 'react-router-dom'
import { ArrowRight, Home, Key, Building2 } from 'lucide-react'
import { useLang } from '@/i18n'

export default function RegisterChoicePage() {
  const { t } = useLang()

  const CHOICES = [
    {
      icon: Key,
      color: 'from-blue-500 to-violet-500',
      bg: 'hover:border-blue-300 hover:shadow-blue-100',
      title: t('auth.choice.tenant.title' as any),
      desc: t('auth.choice.tenant.desc' as any),
      cta: t('auth.choice.tenant.cta' as any),
      href: '/login?register=true',
      external: false,
    },
    {
      icon: Home,
      color: 'from-emerald-500 to-teal-500',
      bg: 'hover:border-emerald-300 hover:shadow-emerald-100',
      title: t('auth.choice.landlord.title' as any),
      desc: t('auth.choice.landlord.desc' as any),
      cta: t('auth.choice.landlord.cta' as any),
      href: '/register/landlord',
      external: false,
    },
    {
      icon: Building2,
      color: 'from-violet-500 to-purple-500',
      bg: 'hover:border-violet-300 hover:shadow-violet-100',
      title: t('auth.choice.agency.title' as any),
      desc: t('auth.choice.agency.desc' as any),
      cta: t('auth.choice.agency.cta' as any),
      href: 'mailto:info@inquilinofacile.it',
      external: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col px-4 py-6">

      {/* Back */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <span className="text-base leading-none">←</span> {t('auth.home')}
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-8">

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
          <span className="text-white font-black text-sm">I</span>
        </div>
        <span className="font-extrabold text-lg text-slate-900">InquilinoFacile.it</span>
      </Link>

      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900">{t('auth.choice.title')}</h1>
          <p className="mt-2 text-slate-500">{t('auth.choice.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CHOICES.map((c) => {
            const Icon = c.icon
            const inner = (
              <div className={`group h-full flex flex-col bg-white rounded-3xl border-2 border-slate-100 p-7 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer ${c.bg}`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="font-bold text-slate-900 text-lg mb-2">{c.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed flex-1">{c.desc}</p>
                <div className={`mt-6 flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>
                  {c.cta}
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )

            return c.external
              ? <a key={c.title} href={c.href} className="h-full">{inner}</a>
              : <Link key={c.title} to={c.href} className="h-full">{inner}</Link>
          })}
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          {t('auth.choice.already')}{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">{t('auth.login.signin_link')}</Link>
        </p>
      </div>

      </div>
    </div>
  )
}
