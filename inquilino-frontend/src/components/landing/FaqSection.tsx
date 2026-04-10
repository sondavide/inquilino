import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/i18n'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const FAQ_COUNT = 8

export default function FaqSection() {
  const { t } = useLang()
  const ref = useScrollReveal()
  const [open, setOpen] = useState<number | null>(null)

  const items = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`landing.faq.q${i + 1}` as any),
    a: t(`landing.faq.a${i + 1}` as any),
  }))

  return (
    <section
      id="faq"
      className="py-20 bg-slate-50"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6" ref={ref}>
        {/* Header */}
        <div className="text-center mb-12 scroll-reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t('landing.faq.title')}
          </h2>
          <p className="mt-3 text-slate-500 text-lg">{t('landing.faq.subtitle')}</p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`scroll-reveal scroll-reveal-delay-${Math.min(i + 1, 5)}`}
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <button
                className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4
                  ${open === i
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-blue-300 hover:shadow-md'
                  }`}
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="font-semibold text-sm sm:text-base" itemProp="name">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>

              {open === i && (
                <div
                  className="px-5 pt-3 pb-4 bg-white border border-t-0 border-slate-200 rounded-b-2xl text-slate-600 text-sm sm:text-base leading-relaxed"
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <div itemProp="text">{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 scroll-reveal">
          <p className="text-slate-500 text-sm">
            Non hai trovato risposta?{' '}
            <a
              href="mailto:info@inquilinofacile.it"
              className="text-blue-600 font-medium hover:underline"
            >
              Scrivici a info@inquilinofacile.it
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
