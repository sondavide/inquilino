import { CheckCircle, Zap, Crown, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'
import { useScrollReveal } from '@/hooks/useScrollReveal'

interface Props { onAgencyCta: () => void }

export default function PricingSection({ onAgencyCta }: Props) {
  const { t } = useLang()
  const ref = useScrollReveal()

  const tenantFeatures    = [1,2,3,4,5].map(n => t(`landing.pricing.tenant.f${n}` as any))
  const landlordFeatures  = [1,2,3,4,5].map(n => t(`landing.pricing.landlord.f${n}` as any))
  const premiumFeatures   = [1,2,3,4].map(n => t(`landing.pricing.premium.f${n}` as any))
  const agencyFeatures    = [1,2,3,4].map(n => t(`landing.pricing.agency.f${n}` as any))

  return (
    <section id="pricing" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>

        {/* Header */}
        <div className="text-center mb-14 scroll-reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-3 text-slate-500 text-lg">{t('landing.pricing.subtitle')}</p>
        </div>

        {/* Top 3 cards: Tenant / Landlord / Landlord Pro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Tenant — Free */}
          <div className="scroll-reveal scroll-reveal-delay-1 bg-white rounded-3xl border border-slate-200 p-7 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-bold text-slate-900">{t('landing.pricing.tenant.name')}</span>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-black text-slate-900">{t('landing.pricing.tenant.price')}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">{t('landing.pricing.tenant.period')}</p>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{t('landing.pricing.tenant.desc')}</p>
            <ul className="space-y-3 flex-1 mb-8">
              {tenantFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="w-full text-center py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              {t('landing.pricing.tenant.cta')}
            </Link>
          </div>

          {/* Landlord — Free */}
          <div className="scroll-reveal scroll-reveal-delay-2 bg-white rounded-3xl border border-slate-200 p-7 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-bold text-slate-900">{t('landing.pricing.landlord.name')}</span>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-black text-slate-900">{t('landing.pricing.landlord.price')}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">{t('landing.pricing.landlord.period')}</p>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{t('landing.pricing.landlord.desc')}</p>
            <ul className="space-y-3 flex-1 mb-8">
              {landlordFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register/landlord"
              className="w-full text-center py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
            >
              {t('landing.pricing.landlord.cta')}
            </Link>
          </div>

          {/* Landlord Pro — Premium (highlighted) */}
          <div className="scroll-reveal scroll-reveal-delay-3 relative bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-7 flex flex-col text-white shadow-2xl shadow-blue-900/30 hover:-translate-y-1 transition-all duration-300">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-amber-400 text-amber-900 text-xs font-black px-4 py-1 rounded-full shadow-lg">
                {t('landing.pricing.most_popular')}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="font-bold">{t('landing.pricing.premium.name')}</span>
                <span className="ml-2 text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  {t('landing.pricing.premium.badge')}
                </span>
              </div>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-black">{t('landing.pricing.premium.price')}</span>
            </div>
            <p className="text-xs text-blue-200 mb-4">{t('landing.pricing.premium.period')}</p>
            <p className="text-sm text-blue-100 mb-6 leading-relaxed">{t('landing.pricing.premium.desc')}</p>
            <ul className="space-y-3 flex-1 mb-8">
              {premiumFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/90">
                  <CheckCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register/landlord"
              className="w-full text-center py-3 rounded-2xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              {t('landing.pricing.premium.cta')}
            </Link>
          </div>
        </div>

        {/* Agency — full-width contact card */}
        <div className="scroll-reveal scroll-reveal-delay-4 bg-slate-900 rounded-3xl p-7 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white text-lg">{t('landing.pricing.agency.name')}</span>
                <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-semibold">
                  {t('landing.pricing.agency.price')}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-3">{t('landing.pricing.agency.desc')}</p>
              <div className="flex flex-wrap gap-2">
                {agencyFeatures.map(f => (
                  <span key={f} className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800 rounded-full px-3 py-1">
                    <CheckCircle className="w-3 h-3 text-violet-400" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onAgencyCta}
            className="shrink-0 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg"
          >
            {t('landing.pricing.agency.cta')}
          </button>
        </div>
      </div>
    </section>
  )
}
