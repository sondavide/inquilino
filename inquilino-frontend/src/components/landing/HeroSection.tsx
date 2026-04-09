import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { useLang } from '@/i18n'
import { useEffect, useRef, useState } from 'react'

const STATS = [
  { key: 'landing.stats.tenants',        value: 2847,  suffix: '+' },
  { key: 'landing.stats.landlords',      value: 1124,  suffix: '+' },
  { key: 'landing.stats.municipalities', value: 186,   suffix: '+' },
  { key: 'landing.stats.completion',     value: 96,    suffix: '%' },
] as const

function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    const duration = 1800
    const steps    = 60
    const step     = target / steps
    let current    = 0
    const interval = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(interval) }
      else setCount(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(interval)
  }, [target, active])
  return count
}

function StatItem({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const count = useCountUp(value, active)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true) }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-black text-white">
        {count.toLocaleString('it-IT')}{suffix}
      </div>
      <div className="text-blue-200 text-sm mt-1 font-medium">{label}</div>
    </div>
  )
}

export default function HeroSection() {
  const { t } = useLang()

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-violet-900">

      {/* Animated blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-violet-500/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] bg-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
        <div className="absolute top-2/3 right-1/4 w-[200px] h-[200px] bg-indigo-400/15 rounded-full blur-2xl animate-blob animation-delay-6000" />
      </div>

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-12 flex flex-col items-center text-center">

        {/* Badge */}
        <div className="glass-card flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-200 mb-8 animate-fade-up">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          {t('landing.hero.badge')}
        </div>

        {/* H1 */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight max-w-4xl animate-fade-up">
          {t('landing.hero.title_line1')}{' '}
          <span className="gradient-text">{t('landing.hero.title_line2')}</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-blue-100/90 text-lg sm:text-xl max-w-2xl leading-relaxed animate-fade-up">
          {t('landing.hero.subtitle')}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-up">
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 transition-colors shadow-2xl shadow-blue-900/40"
          >
            <Zap className="w-4 h-4" />
            {t('landing.hero.cta_tenant')}
          </Link>
          <Link
            to="/register/landlord"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass-card text-white font-bold text-base hover:bg-white/20 transition-colors"
          >
            {t('landing.hero.cta_landlord')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Scroll cue */}
        <button
          onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-16 flex flex-col items-center gap-1 text-blue-300/70 hover:text-blue-200 transition-colors text-xs font-medium"
        >
          <span>{t('landing.hero.scroll')}</span>
          <div className="w-5 h-8 border-2 border-blue-400/30 rounded-full flex justify-center pt-1">
            <div className="w-1 h-2 bg-blue-300/50 rounded-full animate-bounce" />
          </div>
        </button>
      </div>

      {/* Stats band */}
      <div className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <StatItem
                key={s.key}
                value={s.value}
                suffix={s.suffix}
                label={t(s.key as any)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
