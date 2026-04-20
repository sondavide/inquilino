import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'

export default function CostoInquilinoInaffidabilePage() {
  const { lang, t } = useLang()
  const isIt = lang === 'it'

  const meta = {
    title: isIt
      ? 'Quanto Costa un Inquilino Inaffidabile? La Guida per i Proprietari | InquilinoFacile.it'
      : 'What Does an Unreliable Tenant Really Cost? The Landlord\'s Guide | InquilinoFacile.it',
    description: isIt
      ? 'Scopri i costi nascosti di mostrare casa a inquilini inaffidabili: tempo perso, visite inutili, mancati affitti, spese legali. E come InquilinoFacile.it riduce il rischio con profili verificati e scoring oggettivo.'
      : 'Discover the hidden costs of showing your home to unreliable tenants: wasted time, pointless visits, lost rent, legal fees. And how InquilinoFacile.it reduces risk with verified profiles and objective scoring.',
    canonical: 'https://www.inquilinofacile.it/guide/costo-inquilino-inaffidabile',
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <span>←</span>
            <span>{t('guide.back_home')}</span>
          </Link>
          <Link to="/guide" className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
            {t('landing.footer.col_guides')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 mb-6 flex items-center gap-1.5">
          <Link to="/" className="hover:text-slate-600">InquilinoFacile.it</Link>
          <span>/</span>
          <Link to="/guide" className="hover:text-slate-600">{t('landing.footer.col_guides')}</Link>
          <span>/</span>
          <span className="text-slate-500">{t('landing.footer.link_guide_costo')}</span>
        </nav>

        {/* Article header */}
        <div className="mb-10">
          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {isIt ? 'Proprietari' : 'Landlords'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
            {isIt
              ? 'Quanto Costa Davvero un Inquilino Inaffidabile? La Guida per i Proprietari'
              : 'What Does an Unreliable Tenant Really Cost? The Complete Landlord\'s Guide'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{t('guide.min_read', { n: 7 })}</span>
            <span>·</span>
            <span>{isIt ? 'Aggiornato aprile 2026' : 'Updated April 2026'}</span>
          </div>
        </div>

        {/* Article body */}
        <article className="prose prose-slate max-w-none
          prose-headings:font-extrabold prose-headings:text-slate-900
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pt-8 prose-h2:border-t prose-h2:border-slate-100
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
          prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-base
          prose-li:text-slate-600 prose-li:leading-relaxed
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-slate-800">

          {isIt ? <ContentIT /> : <ContentEN />}

        </article>

        {/* Bottom CTA */}
        <div className="mt-16 grid sm:grid-cols-2 gap-4">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
            <p className="font-bold text-slate-900 mb-1">{t('guide.cta.landlord_title')}</p>
            <p className="text-slate-600 text-sm mb-4">{t('guide.cta.landlord_sub')}</p>
            <Link
              to="/register/landlord"
              className="inline-block bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {t('guide.cta.landlord_btn')} →
            </Link>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <p className="font-bold text-slate-900 mb-1">{t('guide.cta.tenant_title')}</p>
            <p className="text-slate-600 text-sm mb-4">{t('guide.cta.tenant_sub')}</p>
            <Link
              to="/register"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {t('guide.cta.tenant_btn')} →
            </Link>
          </div>
        </div>

        {/* Related */}
        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            {isIt ? 'Potrebbe interessarti' : 'You might also like'}
          </p>
          <Link
            to="/guide/trovare-casa-stranieri"
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-lg">🏠</div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors text-sm">
                {t('landing.footer.link_guide_stranieri')}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {isIt ? 'Guida per inquilini' : 'Tenant guide'}
              </p>
            </div>
          </Link>
        </div>
      </main>

      {/* JSON-LD Article schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: isIt
            ? 'Quanto Costa Davvero un Inquilino Inaffidabile? La Guida per i Proprietari'
            : "What Does an Unreliable Tenant Really Cost? The Landlord's Guide",
          description: meta.description,
          image: 'https://www.inquilinofacile.it/og-image.png',
          datePublished: '2026-04-19',
          dateModified: '2026-04-19',
          author: { '@type': 'Organization', name: 'InquilinoFacile.it' },
          publisher: {
            '@type': 'Organization',
            name: 'InquilinoFacile.it',
            logo: { '@type': 'ImageObject', url: 'https://www.inquilinofacile.it/favicon.svg' },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': meta.canonical },
          inLanguage: lang,
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.inquilinofacile.it/' },
              { '@type': 'ListItem', position: 2, name: isIt ? 'Guide' : 'Guides', item: 'https://www.inquilinofacile.it/guide' },
              { '@type': 'ListItem', position: 3, name: isIt ? 'Costo inquilino inaffidabile' : 'Cost of unreliable tenant', item: meta.canonical },
            ],
          },
        })}}
      />
    </div>
  )
}

// ─── Italian content ──────────────────────────────────────────────────────────

function ContentIT() {
  return (
    <>
      <p className="text-lg text-slate-700 leading-relaxed font-medium">
        Il costo di un inquilino sbagliato non si misura solo con l'affitto non pagato. Inizia molto prima — nel momento
        in cui apri la porta a chi non avrebbe mai dovuto varcarla. Ogni visita inutile, ogni settimana di appartamento
        vuoto, ogni telefonata che non porta da nessuna parte: tutto ha un prezzo.
      </p>
      <p>
        Se sei un proprietario che ha messo casa in affitto anche una sola volta, sai di cosa stiamo parlando.
        Facciamo i conti.
      </p>

      <h2>Il costo di ogni visita inutile</h2>
      <p>Considera questo scenario medio per ogni visita organizzata:</p>

      <div className="not-prose overflow-hidden rounded-xl border border-slate-200 my-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Attività</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Tempo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              ['Preparazione e pulizia appartamento', '30 min'],
              ['Spostamento e attesa candidato', '30 min'],
              ['Visita vera e propria', '30–45 min'],
              ['Comunicazioni successive (email, messaggi)', '30 min'],
              ['Totale per visita', '~2 ore'],
            ].map(([a, t], i) => (
              <tr key={i} className={i === 4 ? 'bg-amber-50 font-semibold' : ''}>
                <td className="px-4 py-3 text-slate-700">{a}</td>
                <td className="px-4 py-3 text-right text-slate-700">{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        Se il tuo tempo vale <strong>20€/ora</strong> (stima conservativa), ogni visita inutile ti costa <strong>~40€</strong>.
        La media delle visite necessarie per trovare un inquilino in Italia? Tra <strong>8 e 15</strong>, secondo le
        stime delle agenzie immobiliari. Se solo 5 di queste sono con persone che non hanno mai avuto reale intenzione
        o possibilità di affittare, hai già perso <strong>200€ solo di tempo</strong>.
      </p>

      <h2>Il costo dell'appartamento vuoto</h2>
      <p>
        Ogni settimana di <em>vacancy</em> (appartamento vuoto tra un inquilino e l'altro) è affitto perso. Con un
        affitto medio italiano di <strong>700€/mese</strong>:
      </p>

      <div className="not-prose grid grid-cols-3 gap-3 my-6">
        {[
          { label: '1 mese', value: '€ 700', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: '2 mesi', value: '€ 1.400', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: '3 mesi', value: '€ 2.100', color: 'bg-red-50 border-red-200 text-red-700' },
        ].map((item, i) => (
          <div key={i} className={`border rounded-xl p-4 text-center ${item.color}`}>
            <div className="text-xl font-extrabold mb-0.5">{item.value}</div>
            <div className="text-xs font-medium opacity-80">persi dopo {item.label} di vacancy</div>
          </div>
        ))}
      </div>

      <p>
        Se le visite con candidati inaffidabili allungano la ricerca anche solo di <strong>4 settimane</strong>,
        perdi già un mese intero di affitto. Un mese che non recupererai mai.
      </p>

      <h2>Il costo reale di uno sfratto per morosità</h2>
      <p>
        Questo è il costo più temuto — ed è molto reale. In Italia, lo sfratto per morosità richiede mediamente:
      </p>
      <ul>
        <li><strong>6–18 mesi</strong> di procedura legale (con il rischio di intoppi che lo allungano)</li>
        <li><strong>2.000–5.000€</strong> di spese legali (avvocato, ufficiale giudiziario, notifiche)</li>
        <li>Tutti gli <strong>affitti non riscossi</strong> durante il periodo di procedura</li>
        <li>Eventuali <strong>danni all'immobile</strong> difficilmente recuperabili</li>
      </ul>

      <div className="not-prose bg-red-50 border border-red-200 rounded-xl p-5 my-6">
        <p className="text-sm font-semibold text-red-700 mb-1">Costo medio totale di uno sfratto in Italia</p>
        <p className="text-3xl font-extrabold text-red-600">Oltre 10.000€</p>
        <p className="text-red-500 text-xs mt-1">Fonte: stime Confabitare — incluse spese legali, affitti persi e danni medi</p>
      </div>

      <p>
        E questo senza considerare lo stress, il tempo, l'incertezza e la difficoltà emotiva di gestire una procedura
        di sfratto. La prevenzione vale ogni euro.
      </p>

      <h2>Come scelgono (male) i proprietari oggi</h2>
      <p>Il processo tradizionale di selezione dell'inquilino si basa su:</p>
      <ul>
        <li>Impressioni durante la visita (<em>"mi sembrava una persona seria"</em>)</li>
        <li>Una busta paga portata a mano — non verificata, facilmente falsificabile</li>
        <li>Il contratto di lavoro dichiarato a voce</li>
        <li>Il "sesto senso" del proprietario, spesso distorto da pregiudizi</li>
      </ul>
      <p>
        Il problema? Queste informazioni sono <strong>selettive, falsificabili e influenzate dai bias</strong> di chi
        le valuta. Un candidato sicuro di sé, ben vestito e parlante può passare la selezione meglio di un lavoratore
        onesto con meno <em>bella presenza</em> ma documenti solidissimi.
        Il risultato è una selezione che premia l'apparenza rispetto alla sostanza.
      </p>

      <h2>La soluzione: dati verificati prima ancora della visita</h2>
      <p>
        <strong>InquilinoFacile.it</strong> capovolge il processo. Il proprietario non incontra il candidato al buio:
        prima della visita, può vedere tre indicatori oggettivi basati su documenti reali verificati dall'AI:
      </p>

      <div className="not-prose grid sm:grid-cols-3 gap-4 my-6">
        {[
          {
            icon: '📊',
            title: 'Sostenibilità del canone',
            desc: 'Il rapporto affitto/reddito è sostenibile nel tempo? ALTA / MEDIA / BASSA',
          },
          {
            icon: '🏢',
            title: 'Stabilità reddituale',
            desc: 'Tipo di contratto (indeterminato, determinato, P.IVA), anzianità lavorativa',
          },
          {
            icon: '📄',
            title: 'Affidabilità documentale',
            desc: 'I documenti caricati sono coerenti e verificati da GPT-4o? Nessuna dichiarazione a voce',
          },
        ].map((item, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="font-semibold text-slate-900 text-sm mb-1">{item.title}</p>
            <p className="text-slate-500 text-xs leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      <p>
        Il proprietario decide chi invitare in visita <strong>dopo aver visto i dati</strong> — non basandosi su un
        nome o un'impressione al telefono. Non documenti a mano: dati estratti e verificati da intelligenza artificiale.
      </p>

      <h2>Il risparmio reale con InquilinoFacile.it</h2>
      <p>
        Scenario concreto: un proprietario pubblica un annuncio e riceve <strong>20 candidature</strong>.
      </p>
      <ul>
        <li><strong>Senza InquilinoFacile.it</strong>: 10–15 visite in cieco, 6–8 settimane di ricerca</li>
        <li><strong>Con InquilinoFacile.it</strong>: 3–5 visite pre-selezionate su dati verificati, 2–3 settimane</li>
      </ul>
      <p>
        Risparmio stimato: <strong>4–5 settimane di vacancy</strong> (~700–875€) + <strong>10–15 ore di tempo</strong> (~200–300€)
        = <strong>circa 1.000€ risparmiati per ogni locazione</strong>.
        E questo senza considerare il valore inestimabile di evitare un inquilino moroso.
      </p>

      <h2>Come funziona per i proprietari</h2>
      <ol>
        <li><strong>Registrati gratuitamente</strong> su InquilinoFacile.it come proprietario o agenzia</li>
        <li><strong>Pubblica il tuo annuncio</strong> con le caratteristiche dell'immobile e i requisiti desiderati</li>
        <li><strong>Ricevi candidature</strong> solo da inquilini con profilo verificato e scoring visibile</li>
        <li><strong>Filtra per affidabilità</strong>: vedi subito chi ha scoring ALTA sui tre indicatori</li>
        <li><strong>Organizza visite solo con i migliori candidati</strong> — con dati già verificati alla mano</li>
      </ol>
    </>
  )
}

// ─── English content ──────────────────────────────────────────────────────────

function ContentEN() {
  return (
    <>
      <p className="text-lg text-slate-700 leading-relaxed font-medium">
        The cost of the wrong tenant is not measured only by unpaid rent. It begins much earlier — the moment you open
        the door to someone who should never have crossed it. Every wasted visit, every week the apartment sits empty,
        every phone call that goes nowhere: it all has a price.
      </p>
      <p>
        If you're a landlord who has rented out a property even once, you know exactly what we're talking about.
        Let's do the math.
      </p>

      <h2>The cost of every wasted viewing</h2>
      <p>Consider this average scenario for each viewing you organize:</p>

      <div className="not-prose overflow-hidden rounded-xl border border-slate-200 my-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Activity</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              ['Preparing and cleaning the apartment', '30 min'],
              ['Travel and waiting for the candidate', '30 min'],
              ['The viewing itself', '30–45 min'],
              ['Follow-up communication (emails, messages)', '30 min'],
              ['Total per viewing', '~2 hours'],
            ].map(([a, t], i) => (
              <tr key={i} className={i === 4 ? 'bg-amber-50 font-semibold' : ''}>
                <td className="px-4 py-3 text-slate-700">{a}</td>
                <td className="px-4 py-3 text-right text-slate-700">{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        If your time is worth <strong>€20/hour</strong> (a conservative estimate), every wasted viewing costs you
        about <strong>€40</strong>. The average number of viewings needed to find a tenant in Italy? Between{' '}
        <strong>8 and 15</strong>, according to real estate agency estimates. If only 5 of those are with people
        who never had a real intention or ability to rent, you've already lost <strong>€200 in time alone</strong>.
      </p>

      <h2>The cost of an empty apartment</h2>
      <p>
        Every week of <em>vacancy</em> (empty apartment between tenants) is lost rent. With an average Italian rent
        of <strong>€700/month</strong>:
      </p>

      <div className="not-prose grid grid-cols-3 gap-3 my-6">
        {[
          { label: '1 month', value: '€ 700', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: '2 months', value: '€ 1,400', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: '3 months', value: '€ 2,100', color: 'bg-red-50 border-red-200 text-red-700' },
        ].map((item, i) => (
          <div key={i} className={`border rounded-xl p-4 text-center ${item.color}`}>
            <div className="text-xl font-extrabold mb-0.5">{item.value}</div>
            <div className="text-xs font-medium opacity-80">lost after {item.label} of vacancy</div>
          </div>
        ))}
      </div>

      <p>
        If viewings with unreliable candidates extend your search by just <strong>4 weeks</strong>, you lose a full
        month's rent. Money you will never recover.
      </p>

      <h2>The real cost of an eviction</h2>
      <p>
        This is the most feared cost — and it's very real. In Italy, eviction for non-payment takes on average:
      </p>
      <ul>
        <li><strong>6–18 months</strong> of legal proceedings (with the risk of complications extending it further)</li>
        <li><strong>€2,000–5,000</strong> in legal fees (lawyer, bailiff, notifications)</li>
        <li>All <strong>unpaid rent</strong> during the proceedings period</li>
        <li>Potential <strong>property damage</strong> that is hard to recover</li>
      </ul>

      <div className="not-prose bg-red-50 border border-red-200 rounded-xl p-5 my-6">
        <p className="text-sm font-semibold text-red-700 mb-1">Average total cost of an eviction in Italy</p>
        <p className="text-3xl font-extrabold text-red-600">Over €10,000</p>
        <p className="text-red-500 text-xs mt-1">Source: Confabitare estimates — including legal fees, lost rent, and average property damage</p>
      </div>

      <p>
        And this doesn't account for the stress, time, uncertainty and emotional difficulty of managing an eviction
        process. Prevention is worth every cent.
      </p>

      <h2>How landlords (poorly) select tenants today</h2>
      <p>The traditional tenant selection process relies on:</p>
      <ul>
        <li>Impressions during the viewing (<em>"they seemed reliable"</em>)</li>
        <li>A pay stub handed over — unverified, easily falsified</li>
        <li>A verbally stated employment contract</li>
        <li>The landlord's "gut feeling," often distorted by bias</li>
      </ul>
      <p>
        The problem? This information is <strong>selective, falsifiable, and influenced by the evaluator's biases</strong>.
        A confident, well-dressed, well-spoken candidate can pass the screening better than an honest worker with
        less <em>polish</em> but rock-solid documents. The result is a selection that rewards appearance over substance.
      </p>

      <h2>The solution: verified data before the viewing</h2>
      <p>
        <strong>InquilinoFacile.it</strong> flips the process. The landlord doesn't meet candidates blind: before any
        viewing, they can see three objective indicators based on real AI-verified documents:
      </p>

      <div className="not-prose grid sm:grid-cols-3 gap-4 my-6">
        {[
          {
            icon: '📊',
            title: 'Rent sustainability',
            desc: 'Is the rent-to-income ratio sustainable over time? HIGH / MEDIUM / LOW',
          },
          {
            icon: '🏢',
            title: 'Income stability',
            desc: 'Contract type (permanent, fixed-term, self-employed), seniority at work',
          },
          {
            icon: '📄',
            title: 'Document reliability',
            desc: 'Are the uploaded documents consistent and verified by GPT-4o? No verbal declarations',
          },
        ].map((item, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="font-semibold text-slate-900 text-sm mb-1">{item.title}</p>
            <p className="text-slate-500 text-xs leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      <p>
        The landlord decides who to invite for a viewing <strong>after seeing the data</strong> — not based on a name
        or phone impression. Not hand-delivered documents: data extracted and verified by artificial intelligence.
      </p>

      <h2>The real savings with InquilinoFacile.it</h2>
      <p>
        Concrete scenario: a landlord posts a listing and receives <strong>20 applications</strong>.
      </p>
      <ul>
        <li><strong>Without InquilinoFacile.it</strong>: 10–15 blind viewings, 6–8 weeks of searching</li>
        <li><strong>With InquilinoFacile.it</strong>: 3–5 pre-screened viewings on verified data, 2–3 weeks</li>
      </ul>
      <p>
        Estimated savings: <strong>4–5 weeks of vacancy</strong> (~€700–875) + <strong>10–15 hours of time</strong> (~€200–300)
        = <strong>around €1,000 saved per rental</strong>. And that's without counting the immeasurable value of
        avoiding a defaulting tenant.
      </p>

      <h2>How it works for landlords</h2>
      <ol>
        <li><strong>Register for free</strong> on InquilinoFacile.it as a landlord or agency</li>
        <li><strong>Post your listing</strong> with property details and desired requirements</li>
        <li><strong>Receive applications</strong> only from tenants with a verified profile and visible scoring</li>
        <li><strong>Filter by reliability</strong>: instantly see who has HIGH scoring on all three indicators</li>
        <li><strong>Schedule viewings only with top candidates</strong> — with pre-verified data already in hand</li>
      </ol>
    </>
  )
}
