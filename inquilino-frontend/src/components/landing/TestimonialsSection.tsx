import { Star } from 'lucide-react'
import { useLang } from '@/i18n'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const TESTIMONIALS = [
  {
    name: 'Giulia M.',
    role: 'Inquilina — Milano',
    avatar: 'GM',
    color: 'from-blue-500 to-violet-500',
    text: 'Ho trovato il mio appartamento in meno di due settimane. Il profilo verificato mi ha dato un vantaggio enorme sugli altri candidati. Consiglio vivamente!',
    stars: 5,
  },
  {
    name: 'Davide R.',
    role: 'Locatore privato — Torino',
    avatar: 'DR',
    color: 'from-emerald-500 to-teal-500',
    text: 'Ho affittato il mio appartamento in 10 giorni grazie ai profili documentati. Non ho dovuto chiedere niente: tutto era già verificato e trasparente.',
    stars: 5,
  },
  {
    name: 'Sara P.',
    role: 'Inquilina — Roma',
    avatar: 'SP',
    color: 'from-pink-500 to-rose-500',
    text: 'Finalmente una piattaforma che spiega come funziona lo scoring! Sapere perché ho ottenuto un livello "ALTA" mi ha dato molta fiducia nel presentarmi ai locatori.',
    stars: 5,
  },
  {
    name: 'Marco L.',
    role: 'Property manager — Bologna',
    avatar: 'ML',
    color: 'from-amber-500 to-orange-500',
    text: 'Gestisco 12 appartamenti e InquilinoFacile.it mi ha dimezzato il tempo di selezione. I profili sono seri e documentati: zero perdite di tempo con candidature fantasma.',
    stars: 5,
  },
  {
    name: 'Federica T.',
    role: 'Inquilina — Firenze',
    avatar: 'FT',
    color: 'from-violet-500 to-indigo-500',
    text: 'Il chatbot AI è sorprendentemente semplice da usare. Mi ha guidata passo passo senza stress, e in meno di un\'ora avevo già il profilo completo.',
    stars: 5,
  },
  {
    name: 'Luca B.',
    role: 'Locatore — Napoli',
    avatar: 'LB',
    color: 'from-cyan-500 to-blue-500',
    text: 'La cosa che mi ha convinto di più è la trasparenza: so esattamente come viene calcolato il profilo dell\'inquilino. Nessun algoritmo opaco.',
    stars: 5,
  },
]

export default function TestimonialsSection() {
  const { t } = useLang()
  const ref = useScrollReveal()

  return (
    <section id="testimonials" className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6" ref={ref}>
        {/* Header */}
        <div className="text-center mb-14 scroll-reveal">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t('landing.testimonials.title')}
          </h2>
          <p className="mt-3 text-slate-500 text-lg">
            {t('landing.testimonials.subtitle')}
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((item, i) => (
            <article
              key={i}
              className={`scroll-reveal scroll-reveal-delay-${Math.min(i % 3 + 1, 5)} bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: item.stars }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-slate-700 text-sm leading-relaxed mb-5">
                "{item.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                >
                  {item.avatar}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 mt-14 scroll-reveal">
          {[
            { emoji: '🔒', label: 'GDPR Compliant' },
            { emoji: '🤖', label: 'AI Act Compliant' },
            { emoji: '🛡️', label: 'Dati cifrati AES-256' },
            { emoji: '✅', label: 'Zero discriminazioni' },
            { emoji: '👁️', label: 'Algoritmo spiegabile' },
          ].map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-600 font-medium"
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
