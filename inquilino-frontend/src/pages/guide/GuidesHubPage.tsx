import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'

const GUIDES = [
  {
    slug: '/guide/trovare-casa-stranieri',
    emoji: '🏠',
    color: 'bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
    badge: { it: 'Inquilini', en: 'Tenants' },
    title: {
      it: 'Trovare Casa da Straniero in Italia: Pregiudizi, Diritti e Come Difendersi',
      en: 'Finding a Home as a Foreigner in Italy: Prejudice, Rights and How to Protect Yourself',
    },
    desc: {
      it: 'Il 70% degli stranieri in Italia dichiara difficoltà nel trovare casa. Scopri le cause, i diritti, la storia di Omar — e come un profilo verificato cambia tutto.',
      en: '70% of foreigners in Italy report housing discrimination. Learn the causes, your rights, Omar\'s story, and how a verified profile changes everything.',
    },
    readMin: 8,
  },
  {
    slug: '/guide/costo-inquilino-inaffidabile',
    emoji: '💸',
    color: 'bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
    badge: { it: 'Proprietari', en: 'Landlords' },
    title: {
      it: 'Quanto Costa Davvero un Inquilino Inaffidabile? La Guida per i Proprietari',
      en: "What Does an Unreliable Tenant Really Cost? The Landlord's Guide",
    },
    desc: {
      it: 'Visite inutili, mesi di vacancy, sfratti che costano oltre 10.000€. Calcoliamo il costo reale di scegliere l\'inquilino sbagliato e come evitarlo.',
      en: 'Wasted viewings, months of vacancy, evictions costing over €10,000. We calculate the real cost of choosing the wrong tenant and how to avoid it.',
    },
    readMin: 7,
  },
]

export default function GuidesHubPage() {
  const { lang, t } = useLang()
  const isIt = lang === 'it'

  const meta = {
    title: isIt
      ? 'Guide InquilinoFacile — Risorse per Inquilini e Proprietari | InquilinoFacile.it'
      : 'InquilinoFacile Guides — Resources for Tenants and Landlords | InquilinoFacile.it',
    description: isIt
      ? 'Articoli e guide pratiche sul mercato degli affitti in Italia: discriminazione, costi nascosti, diritti degli inquilini, consigli per i proprietari.'
      : 'Articles and practical guides on the Italian rental market: discrimination, hidden costs, tenant rights, tips for landlords.',
    canonical: 'https://www.inquilinofacile.it/guide',
  }

  useEffect(() => {
    document.title = meta.title
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', meta.description)
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.setAttribute('href', meta.canonical)
    return () => {
      document.title = 'InquilinoFacile.it — Affitto sicuro con inquilini verificati'
    }
  }, [lang])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <span>←</span>
            <span>{t('guide.back_home')}</span>
          </Link>
          <Link to="/register" className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors">
            {isIt ? 'Inizia gratis' : 'Start free'}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 mb-8 flex items-center gap-1.5">
          <Link to="/" className="hover:text-slate-600">InquilinoFacile.it</Link>
          <span>/</span>
          <span className="text-slate-500">{t('landing.footer.col_guides')}</span>
        </nav>

        {/* Hub header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
            {isIt ? 'Guide & Risorse' : 'Guides & Resources'}
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl">
            {isIt
              ? 'Articoli pratici sul mercato degli affitti in Italia: diritti, costi, storie reali e strumenti per fare scelte più consapevoli.'
              : 'Practical articles on the Italian rental market: rights, costs, real stories, and tools for making more informed decisions.'}
          </p>
        </div>

        {/* Guide cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {GUIDES.map(guide => (
            <Link
              key={guide.slug}
              to={guide.slug}
              className={`border rounded-2xl p-6 sm:p-8 flex flex-col gap-4 hover:shadow-md transition-shadow group ${guide.color}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-4xl">{guide.emoji}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-1 ${guide.badgeColor}`}>
                  {guide.badge[lang]}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug mb-2">
                  {guide.title[lang]}
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {guide.desc[lang]}
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-xs text-slate-400">{t('guide.min_read', { n: guide.readMin })}</span>
                <span className="text-blue-600 text-sm font-semibold group-hover:translate-x-1 transition-transform inline-block">
                  {isIt ? 'Leggi →' : 'Read →'}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA banner */}
        <div className="mt-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-8 sm:p-10 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            {isIt ? 'Pronto a fare la differenza?' : 'Ready to make a difference?'}
          </h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            {isIt
              ? 'InquilinoFacile.it è gratuito per gli inquilini. Crea il tuo profilo verificato e presentati con dati oggettivi.'
              : 'InquilinoFacile.it is free for tenants. Create your verified profile and present yourself with objective data.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
            >
              {t('guide.cta.tenant_btn')} →
            </Link>
            <Link
              to="/register/landlord"
              className="bg-white/10 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm"
            >
              {t('guide.cta.landlord_btn')} →
            </Link>
          </div>
        </div>
      </main>

      {/* JSON-LD CollectionPage schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: isIt ? 'Guide InquilinoFacile' : 'InquilinoFacile Guides',
          description: meta.description,
          url: meta.canonical,
          inLanguage: lang,
          publisher: {
            '@type': 'Organization',
            name: 'InquilinoFacile.it',
            logo: { '@type': 'ImageObject', url: 'https://www.inquilinofacile.it/favicon.svg' },
          },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.inquilinofacile.it/' },
              { '@type': 'ListItem', position: 2, name: isIt ? 'Guide' : 'Guides', item: meta.canonical },
            ],
          },
          hasPart: GUIDES.map(g => ({
            '@type': 'Article',
            name: g.title[lang],
            description: g.desc[lang],
            url: `https://www.inquilinofacile.it${g.slug}`,
          })),
        })}}
      />
    </div>
  )
}
