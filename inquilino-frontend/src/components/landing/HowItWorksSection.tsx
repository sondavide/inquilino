import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { useLang } from '@/i18n'
import { useScrollReveal } from '@/hooks/useScrollReveal'

type Tab = 'tenant' | 'landlord' | 'agency'

interface Step { titleKey: string; descKey: string; icon: string }
interface TabConfig {
  id: Tab
  labelKey: string
  color: string
  gradientFrom: string
  gradientTo: string
  steps: Step[]
  benefitKeys: string[]
  ctaKey: string
  ctaHref: string
  isModal?: boolean
}

const TABS: TabConfig[] = [
  {
    id: 'tenant',
    labelKey: 'landing.how.tab_tenant',
    color: 'blue',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-violet-600',
    steps: [
      { titleKey: 'landing.how.tenant.step1.title', descKey: 'landing.how.tenant.step1.desc', icon: '👤' },
      { titleKey: 'landing.how.tenant.step2.title', descKey: 'landing.how.tenant.step2.desc', icon: '🤖' },
      { titleKey: 'landing.how.tenant.step3.title', descKey: 'landing.how.tenant.step3.desc', icon: '📄' },
      { titleKey: 'landing.how.tenant.step4.title', descKey: 'landing.how.tenant.step4.desc', icon: '⭐' },
      { titleKey: 'landing.how.tenant.step5.title', descKey: 'landing.how.tenant.step5.desc', icon: '🏠' },
    ],
    benefitKeys: [
      'landing.how.tenant.benefit1',
      'landing.how.tenant.benefit2',
      'landing.how.tenant.benefit3',
      'landing.how.tenant.benefit4',
    ],
    ctaKey: 'landing.how.tenant.cta',
    ctaHref: '/register',
  },
  {
    id: 'landlord',
    labelKey: 'landing.how.tab_landlord',
    color: 'emerald',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-teal-600',
    steps: [
      { titleKey: 'landing.how.landlord.step1.title', descKey: 'landing.how.landlord.step1.desc', icon: '🔑' },
      { titleKey: 'landing.how.landlord.step2.title', descKey: 'landing.how.landlord.step2.desc', icon: '🏡' },
      { titleKey: 'landing.how.landlord.step3.title', descKey: 'landing.how.landlord.step3.desc', icon: '🔍' },
      { titleKey: 'landing.how.landlord.step4.title', descKey: 'landing.how.landlord.step4.desc', icon: '🎯' },
      { titleKey: 'landing.how.landlord.step5.title', descKey: 'landing.how.landlord.step5.desc', icon: '💬' },
    ],
    benefitKeys: [
      'landing.how.landlord.benefit1',
      'landing.how.landlord.benefit2',
      'landing.how.landlord.benefit3',
      'landing.how.landlord.benefit4',
    ],
    ctaKey: 'landing.how.landlord.cta',
    ctaHref: '/register',
  },
  {
    id: 'agency',
    labelKey: 'landing.how.tab_agency',
    color: 'violet',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-purple-600',
    steps: [
      { titleKey: 'landing.how.agency.step1.title', descKey: 'landing.how.agency.step1.desc', icon: '🤝' },
      { titleKey: 'landing.how.agency.step2.title', descKey: 'landing.how.agency.step2.desc', icon: '📍' },
      { titleKey: 'landing.how.agency.step3.title', descKey: 'landing.how.agency.step3.desc', icon: '✅' },
      { titleKey: 'landing.how.agency.step4.title', descKey: 'landing.how.agency.step4.desc', icon: '📊' },
    ],
    benefitKeys: [
      'landing.how.agency.benefit1',
      'landing.how.agency.benefit2',
      'landing.how.agency.benefit3',
      'landing.how.agency.benefit4',
    ],
    ctaKey: 'landing.how.agency.cta',
    ctaHref: '#',
    isModal: true,
  },
]

interface Props { onAgencyCta: () => void }

export default function HowItWorksSection({ onAgencyCta }: Props) {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState<Tab>('tenant')
  const ref = useScrollReveal([activeTab])
  const tab = TABS.find(t => t.id === activeTab)!

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>

        {/* Header */}
        <div className="text-center mb-12 scroll-reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t('landing.how.title')}
          </h2>
          <p className="mt-3 text-slate-500 text-lg">{t('landing.how.subtitle')}</p>
        </div>

        {/* Tab pills */}
        <div className="flex justify-center mb-12 scroll-reveal">
          <div className="inline-flex bg-slate-100 rounded-2xl p-1.5 gap-1">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setActiveTab(tb.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${activeTab === tb.id
                    ? `bg-gradient-to-r ${tb.gradientFrom} ${tb.gradientTo} text-white shadow-lg`
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {t(tb.labelKey as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* Steps */}
          <div className="space-y-4">
            {tab.steps.map((step, i) => (
              <div
                key={i}
                className={`scroll-reveal scroll-reveal-delay-${Math.min(i + 1, 5)} flex gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tab.gradientFrom} ${tab.gradientTo} flex items-center justify-center text-white font-black text-lg shrink-0`}
                >
                  <span className="text-xl" role="img">{step.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold bg-gradient-to-r ${tab.gradientFrom} ${tab.gradientTo} bg-clip-text text-transparent`}>
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{t(step.titleKey as any)}</h3>
                  <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{t(step.descKey as any)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Benefits + CTA */}
          <div className="space-y-6">
            <div className={`rounded-3xl bg-gradient-to-br ${tab.gradientFrom} ${tab.gradientTo} p-6 text-white scroll-reveal scroll-reveal-delay-2`}>
              <h3 className="font-bold text-lg mb-4">{t('landing.how.benefits_title')}</h3>
              <ul className="space-y-3">
                {tab.benefitKeys.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 shrink-0 text-white/80 mt-0.5" />
                    <span className="text-white/90 text-sm leading-relaxed">{t(key as any)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="scroll-reveal scroll-reveal-delay-3">
              {tab.isModal ? (
                <button
                  onClick={onAgencyCta}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r ${tab.gradientFrom} ${tab.gradientTo} text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg`}
                >
                  {t(tab.ctaKey as any)}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  to={tab.ctaHref}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r ${tab.gradientFrom} ${tab.gradientTo} text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg`}
                >
                  {t(tab.ctaKey as any)}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
