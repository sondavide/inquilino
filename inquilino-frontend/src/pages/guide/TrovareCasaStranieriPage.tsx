import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/i18n'

export default function TrovareCasaStranieriPage() {
  const { lang, t } = useLang()
  const isIt = lang === 'it'

  const meta = {
    title: isIt
      ? 'Trovare Casa da Straniero in Italia: Pregiudizi, Diritti e Come Difendersi | InquilinoFacile.it'
      : 'Finding a Home as a Foreigner in Italy: Prejudice, Rights and How to Protect Yourself | InquilinoFacile.it',
    description: isIt
      ? 'Scopri le difficoltà reali che incontrano gli stranieri nel trovare casa in affitto in Italia, le discriminazioni illegali e come InquilinoFacile.it trasforma un profilo documentato in un vantaggio concreto.'
      : 'Discover the real difficulties foreigners face finding rental housing in Italy, illegal discrimination, and how InquilinoFacile.it turns a documented profile into a concrete advantage.',
    canonical: 'https://www.inquilinofacile.it/guide/trovare-casa-stranieri',
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
          <span className="text-slate-500">{t('landing.footer.link_guide_stranieri')}</span>
        </nav>

        {/* Article header */}
        <div className="mb-10">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {isIt ? 'Inquilini' : 'Tenants'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
            {isIt
              ? 'Trovare Casa da Straniero in Italia: Pregiudizi, Diritti e Come Difendersi'
              : 'Finding a Home as a Foreigner in Italy: Prejudice, Rights and How to Protect Yourself'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{t('guide.min_read', { n: 8 })}</span>
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
        </div>

        {/* Related */}
        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            {isIt ? 'Potrebbe interessarti' : 'You might also like'}
          </p>
          <Link
            to="/guide/costo-inquilino-inaffidabile"
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-lg">💸</div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors text-sm">
                {t('landing.footer.link_guide_costo')}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {isIt ? 'Guida per proprietari' : 'Landlord guide'}
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
            ? 'Trovare Casa da Straniero in Italia: Pregiudizi, Diritti e Come Difendersi'
            : 'Finding a Home as a Foreigner in Italy: Prejudice, Rights and How to Protect Yourself',
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
              { '@type': 'ListItem', position: 3, name: isIt ? 'Trovare casa da straniero' : 'Finding a home as a foreigner', item: meta.canonical },
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
        Il mercato degli affitti in Italia nasconde una discriminazione silenziosa. Migliaia di persone ogni anno si sentono
        rispondere "l'appartamento è già stato affittato" subito dopo aver lasciato il proprio nome o dopo una videochiamata —
        non per mancanza di documenti, non per reddito insufficiente, ma per un cognome che suona straniero.
      </p>
      <p>
        È un problema reale, diffuso e spesso non denunciato. In questo articolo esploriamo le cause, i dati e,
        soprattutto, le soluzioni concrete.
      </p>

      <h2>I numeri della discriminazione negli affitti</h2>
      <p>
        Lo dimostra uno studio sperimentale condotto dagli economisti <strong>Massimo Baldini e Marta Federici</strong> e
        pubblicato su{' '}
        <a href="https://lavoce.info/archives/26422/non-si-affitta-agli-immigrati/" target="_blank" rel="noopener noreferrer">
          LaVoce.info
        </a>{' '}
        (2010). I ricercatori hanno creato <strong>12 identità fittizie</strong> — metà con nomi italiani, metà con nomi
        arabo-musulmani o dell'Europa dell'Est — e hanno inviato circa <strong>3.000 email</strong> a proprietari in
        <strong> 41 città italiane</strong>, a parità di profilo lavorativo e familiare.
      </p>
      <p>Il risultato è inequivocabile:</p>
      <ul>
        <li>I candidati con <strong>nome italiano</strong> hanno ricevuto una risposta positiva nel <strong>62%</strong> dei casi</li>
        <li>I candidati con <strong>nome arabo</strong> solo nel <strong>44%</strong> dei casi</li>
        <li>I candidati con <strong>nome dell'Europa dell'Est</strong> nel <strong>49,5%</strong> dei casi</li>
      </ul>
      <p>
        In altre parole, avere un nome arabo riduce la probabilità di ricevere risposta di{' '}
        <strong>18 punti percentuali</strong> rispetto a un nome italiano — a parità di ogni altra variabile. Al Nord
        il divario è ancora più marcato. Non è impressione: è misurabile.
      </p>

      {/* Stats cards */}
      <div className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
        {[
          { value: '62%', label: 'tasso di risposta per nomi italiani in uno studio su ~3.000 email in 41 città' },
          { value: '44%', label: 'tasso di risposta per nomi arabi — 18 punti percentuali in meno' },
          { value: '49,5%', label: 'tasso di risposta per nomi dell\'Europa dell\'Est, a parità di profilo' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-blue-600 mb-1">{s.value}</div>
            <p className="text-slate-500 text-xs leading-snug">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 -mt-4 mb-6">
        Fonte: Baldini M., Federici M., "Non si affitta agli immigrati",{' '}
        <a href="https://lavoce.info/archives/26422/non-si-affitta-agli-immigrati/" target="_blank" rel="noopener noreferrer" className="underline">
          LaVoce.info
        </a>, 2010.
      </p>

      <p>
        Il fenomeno non appartiene solo al passato. Nel <strong>2022</strong> un'inchiesta de{' '}
        <a href="https://www.ildolomiti.it/politica/2022/se-non-hai-un-cognome-abbastanza-trentino-e-difficile-trovare-casa-famiglie-sfrattate-e-stranieri-penalizzati-chi-tiene-lappartamento-sfitto-deve-pagare-piu-tasse-0" target="_blank" rel="noopener noreferrer">
          Il Dolomiti
        </a>{' '}
        documentava la stessa dinamica in Trentino, dove il Centro Sociale Bruno e l'Assemblea contro il caro vita
        denunciavano apertamente che chi cerca casa attraverso le agenzie private{' '}
        <em>"trova solo porte chiuse"</em> e che avere un cognome <em>"non abbastanza trentino"</em> può bastare
        per essere esclusi dal mercato — nonostante residenza regolare e pagamento delle tasse.
      </p>

      {/* Trentino callout */}
      <div className="not-prose bg-amber-50 border border-amber-200 rounded-xl p-5 my-6 text-sm">
        <p className="font-semibold text-amber-800 mb-3">Trentino, 2022 — i numeri del mercato pubblico</p>
        <ul className="space-y-2 text-amber-900">
          <li className="flex gap-2"><span className="shrink-0 font-bold">6%</span><span>degli alloggi ITEA assegnati va a cittadini extracomunitari</span></li>
          <li className="flex gap-2"><span className="shrink-0 font-bold">91%</span><span>degli assegnatari è cittadino italiano</span></li>
          <li className="flex gap-2"><span className="shrink-0 font-bold">1.215</span><span>alloggi pubblici sfitti o non occupabili sul territorio trentino</span></li>
          <li className="flex gap-2"><span className="shrink-0 font-bold">fino a 6</span><span>mensilità di cauzione richieste nel mercato privato (3.000–4.000 €)</span></li>
        </ul>
        <p className="text-amber-700 text-xs mt-3">Fonte: Il Dolomiti, agosto 2022 · dati ITEA 2020</p>
      </div>

      <p>
        La cauzione fino a sei mensilità è un ostacolo ulteriore che colpisce in modo sproporzionato chi non ha
        una rete familiare o patrimoniale in Italia — un onere che un profilo verificato non elimina, ma che
        aiuta a superare convincendo il proprietario più rapidamente, riducendo il numero di rifiuti prima di
        trovare chi è disposto a trattare.
      </p>

      <p>I proprietari che ammettono pregiudizi citano motivazioni come:</p>
      <ul>
        <li>Timore di ritardi nei pagamenti (stereotipo non supportato dai dati dello studio)</li>
        <li>Dubbi sulla stabilità lavorativa (infondata: il profilo lavorativo era identico)</li>
        <li>Difficoltà linguistiche nella comunicazione</li>
        <li>Semplicemente: <em>"preferisco italiani"</em></li>
      </ul>
      <p>
        Quest'ultimo caso non è solo eticamente sbagliato — <strong>è illegale</strong>.
      </p>

      <h2>La discriminazione è illegale in Italia</h2>
      <p>
        L'<strong>articolo 3 della Costituzione italiana</strong> garantisce uguaglianza davanti alla legge "senza distinzione
        di razza, lingua, religione, opinioni politiche, condizioni personali e sociali". Il{' '}
        <strong>Decreto Legislativo 215/2003</strong>, che recepisce la direttiva europea 2000/43/CE, vieta esplicitamente
        la discriminazione etnica nell'accesso all'abitazione.
      </p>
      <p>
        Eppure le denunce sono rarissime. Perché? Perché la discriminazione nel mercato immobiliare è difficile da provare,
        spesso velata da scuse plausibili: "ho già dato l'appartamento", "cerco qualcuno con contratto a tempo indeterminato",
        "preferirei una coppia senza figli". La forma cambia, il risultato no.
      </p>

      <h2>La storia di Omar: trovare casa con i dati, non con il nome</h2>

      {/* Testimonial card */}
      <div className="not-prose bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-200 rounded-2xl p-6 sm:p-8 my-8">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-extrabold text-xl shrink-0">O</div>
          <div>
            <p className="font-bold text-slate-900">Omar B.</p>
            <p className="text-slate-500 text-sm">Fruttivendolo · In Italia da 13 anni · Milano</p>
          </div>
        </div>
        <blockquote className="text-slate-700 text-base leading-relaxed italic border-l-4 border-blue-400 pl-4 mb-4">
          "Rispondevo agli annunci entro minuti. Mandavo una mail educata, spiegavo che lavoro faccio, quanto guadagno.
          Spesso non ricevevo risposta. Altre volte mi veniva detto 'è già affittato', ma poi l'annuncio restava online
          per settimane."
        </blockquote>
        <p className="text-slate-500 text-sm">Tre mesi di ricerca. Decine di annunci ignorati.</p>
      </div>

      <p>
        Omar è arrivato in Italia dall'Egitto tredici anni fa. Oggi gestisce una piccola frutteria nel cuore di Milano —
        un lavoro che svolge da anni con puntualità e passione, con contratto regolare alle spalle. Quando il suo vecchio
        padrone di casa ha venduto l'immobile e Omar ha dovuto trovare una nuova sistemazione, la sua ricerca si è
        trasformata in un calvario.
      </p>
      <p>
        Tre mesi di ricerca. Decine di annunci ignorati. Alcune visite andate bene… poi silenzio.
        Le sue buste paga erano in ordine. Il suo contratto era a tempo indeterminato. Il suo reddito era più che
        sufficiente per sostenere l'affitto richiesto. Eppure.
      </p>
      <p>
        La svolta è arrivata con <strong>InquilinoFacile.it</strong>. Omar ha creato il suo profilo, ha caricato le buste
        paga degli ultimi tre mesi e il contratto di lavoro. La piattaforma ha verificato i documenti tramite AI e generato
        un profilo con scoring <strong>ALTO</strong> per sostenibilità del canone e stabilità reddituale.
      </p>
      <blockquote>
        "La prima volta che ho mandato il link del mio profilo a un proprietario, mi ha risposto in un'ora. Non voleva sapere
        da dove venivo — voleva sapere se potevo pagare l'affitto. E il sistema glielo diceva chiaramente."
      </blockquote>
      <p>
        In <strong>due settimane</strong>, Omar ha trovato casa. Lo stesso Omar che per mesi era stato ignorato, con gli
        stessi soldi, lo stesso lavoro, la stessa storia — ma con dati oggettivi davanti agli occhi del proprietario.
      </p>

      <h2>Perché i pregiudizi cedono ai dati</h2>
      <p>
        Il problema della discriminazione non è sempre malafede. Spesso è <strong>paura</strong>: paura di scegliere la
        persona sbagliata, paura di non riuscire a comunicare, paura di un moroso. Una paura che, in assenza di dati
        oggettivi, si riempie di stereotipi.
      </p>
      <p>
        Quando un proprietario vede un profilo con documenti verificati, buste paga certificate e un indicatore di
        affidabilità trasparente, quella paura si riduce. Non perché abbia cambiato i propri pregiudizi — ma perché
        i dati parlano al posto del nome.
      </p>
      <p>
        <strong>InquilinoFacile.it non risolve la discriminazione razziale.</strong> Ma toglie le scuse.
        Un profilo documentato con scoring ALTO è difficile da ignorare: rifiutarlo senza una ragione oggettiva
        espone il proprietario a responsabilità legali.
      </p>

      <h2>Come creare un profilo che parla da solo</h2>
      <ol>
        <li><strong>Registrati gratuitamente</strong> su InquilinoFacile.it — nessun costo per gli inquilini</li>
        <li><strong>Completa il wizard di onboarding</strong>: 18 domande guidate da AI in italiano o inglese</li>
        <li><strong>Carica i documenti</strong>: buste paga, contratto di lavoro, dichiarazione dei redditi</li>
        <li><strong>Ottieni il tuo scoring</strong>: ALTA/MEDIA/BASSA affidabilità per tre indicatori oggettivi</li>
        <li><strong>Condividi il link</strong> del tuo profilo verificato con i proprietari che ti interessano</li>
      </ol>
      <p>
        I dati sono tuoi. Condividi solo ciò che scegli di condividere. I documenti originali non vengono mai mostrati
        ai proprietari — solo gli indicatori aggregati e verificati.
      </p>

      <h2>Cosa fare se sei vittima di discriminazione</h2>
      <ul>
        <li><strong>Conserva le prove</strong>: screenshot degli annunci, email, messaggi WhatsApp con date e orari</li>
        <li>
          <strong>Segnala all'UNAR</strong> (Ufficio Nazionale Antidiscriminazioni Razziali): il sito è{' '}
          <a href="https://www.unar.it" target="_blank" rel="noopener noreferrer">www.unar.it</a> — la segnalazione è
          gratuita e confidenziale
        </li>
        <li><strong>Contatta un CAF o patronato</strong> per assistenza legale gratuita</li>
        <li>
          <strong>Considera una denuncia formale</strong>: il D.Lgs. 215/2003 prevede sanzioni per chi discrimina
          nell'accesso all'abitazione
        </li>
      </ul>
    </>
  )
}

// ─── English content ──────────────────────────────────────────────────────────

function ContentEN() {
  return (
    <>
      <p className="text-lg text-slate-700 leading-relaxed font-medium">
        Italy's rental market hides a silent discrimination. Every year, thousands of people receive the reply
        "the apartment has already been rented" right after leaving their name or after a video call — not because
        they lack documents, not because their income is too low, but because their surname sounds foreign.
      </p>
      <p>
        This is a real, widespread, and largely unreported problem. In this article we explore the causes, the data,
        and most importantly, the concrete solutions.
      </p>

      <h2>The numbers behind rental discrimination</h2>
      <p>
        A landmark experimental study by economists <strong>Massimo Baldini and Marta Federici</strong>, published on{' '}
        <a href="https://lavoce.info/archives/26422/non-si-affitta-agli-immigrati/" target="_blank" rel="noopener noreferrer">
          LaVoce.info
        </a>{' '}
        (2010), put a precise number on this phenomenon. The researchers created <strong>12 fictional identities</strong> —
        half with Italian names, half with Arab-Muslim or Eastern European names — and sent approximately{' '}
        <strong>3,000 emails</strong> to landlords across <strong>41 Italian cities</strong>, keeping work and family
        profiles identical across groups.
      </p>
      <p>The results are unambiguous:</p>
      <ul>
        <li>Candidates with <strong>Italian names</strong> received a positive reply <strong>62%</strong> of the time</li>
        <li>Candidates with <strong>Arab names</strong> only <strong>44%</strong> of the time</li>
        <li>Candidates with <strong>Eastern European names</strong> only <strong>49.5%</strong> of the time</li>
      </ul>
      <p>
        In other words, having an Arab name reduces the probability of receiving a reply by{' '}
        <strong>18 percentage points</strong> compared to an Italian name — with every other variable held equal.
        In northern Italy the gap is even wider. This is not anecdote: it is measurable.
      </p>

      {/* Stats cards */}
      <div className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
        {[
          { value: '62%', label: 'reply rate for Italian names across ~3,000 emails in 41 cities' },
          { value: '44%', label: 'reply rate for Arab names — 18 percentage points less' },
          { value: '49.5%', label: 'reply rate for Eastern European names, same profile' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-blue-600 mb-1">{s.value}</div>
            <p className="text-slate-500 text-xs leading-snug">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 -mt-4 mb-6">
        Source: Baldini M., Federici M., "Non si affitta agli immigrati",{' '}
        <a href="https://lavoce.info/archives/26422/non-si-affitta-agli-immigrati/" target="_blank" rel="noopener noreferrer" className="underline">
          LaVoce.info
        </a>, 2010.
      </p>

      <p>
        The phenomenon is not confined to 2010. In <strong>2022</strong>, an investigation by{' '}
        <a href="https://www.ildolomiti.it/politica/2022/se-non-hai-un-cognome-abbastanza-trentino-e-difficile-trovare-casa-famiglie-sfrattate-e-stranieri-penalizzati-chi-tiene-lappartamento-sfitto-deve-pagare-piu-tasse-0" target="_blank" rel="noopener noreferrer">
          Il Dolomiti
        </a>{' '}
        documented the same dynamic in Trentino, where local activist groups publicly reported that people
        looking for housing through private agencies <em>"find only closed doors"</em> and that having a surname
        that is <em>"not Trentino enough"</em> can be sufficient grounds for exclusion — despite legal residency
        and regular tax contributions.
      </p>

      {/* Trentino callout */}
      <div className="not-prose bg-amber-50 border border-amber-200 rounded-xl p-5 my-6 text-sm">
        <p className="font-semibold text-amber-800 mb-3">Trentino, 2022 — the public housing figures</p>
        <ul className="space-y-2 text-amber-900">
          <li className="flex gap-2"><span className="shrink-0 font-bold">6%</span><span>of ITEA public housing units allocated to non-EU citizens</span></li>
          <li className="flex gap-2"><span className="shrink-0 font-bold">91%</span><span>of allocations go to Italian citizens</span></li>
          <li className="flex gap-2"><span className="shrink-0 font-bold">1,215</span><span>public housing units sitting empty or unusable across Trentino</span></li>
          <li className="flex gap-2"><span className="shrink-0 font-bold">up to 6</span><span>months' deposit required in the private market (€3,000–4,000)</span></li>
        </ul>
        <p className="text-amber-700 text-xs mt-3">Source: Il Dolomiti, August 2022 · ITEA 2020 data</p>
      </div>

      <p>
        The up-to-six-month deposit requirement is an additional barrier that disproportionately affects those
        without a family or financial network in Italy — a burden that a verified profile doesn't eliminate, but
        helps overcome by convincing landlords more quickly and reducing the number of rejections before finding
        someone willing to proceed.
      </p>

      <p>Landlords who admit bias cite reasons like:</p>
      <ul>
        <li>Fear of late payments (a stereotype unsupported by the study's data)</li>
        <li>Doubts about job stability (unfounded: work profiles were identical)</li>
        <li>Language barriers in communication</li>
        <li>Simply: <em>"I prefer Italians"</em></li>
      </ul>
      <p>
        The last case is not just ethically wrong — <strong>it is illegal</strong>.
      </p>

      <h2>Discrimination is illegal in Italy</h2>
      <p>
        <strong>Article 3 of the Italian Constitution</strong> guarantees equality before the law "without distinction of
        race, language, religion, political opinions, personal and social conditions." <strong>Legislative Decree 215/2003</strong>,
        implementing EU Directive 2000/43/CE, explicitly prohibits ethnic discrimination in access to housing.
      </p>
      <p>
        Yet reports are very few. Why? Because discrimination in the real estate market is hard to prove, often hidden
        behind plausible excuses: "I've already given the apartment to someone", "I need someone with a permanent contract",
        "I'd prefer a couple without children". The wording changes; the outcome does not.
      </p>

      <h2>Omar's story: finding a home with data, not with a name</h2>

      {/* Testimonial card */}
      <div className="not-prose bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-200 rounded-2xl p-6 sm:p-8 my-8">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-extrabold text-xl shrink-0">O</div>
          <div>
            <p className="font-bold text-slate-900">Omar B.</p>
            <p className="text-slate-500 text-sm">Fruit vendor · 13 years in Italy · Milan</p>
          </div>
        </div>
        <blockquote className="text-slate-700 text-base leading-relaxed italic border-l-4 border-blue-400 pl-4 mb-4">
          "I replied to listings within minutes. I'd send a polite email, explain my job, how much I earn. Often I'd get no
          reply. Other times I was told 'it's already rented,' but then the listing would stay online for weeks."
        </blockquote>
        <p className="text-slate-500 text-sm">Three months of searching. Dozens of listings ignored.</p>
      </div>

      <p>
        Omar came to Italy from Egypt thirteen years ago. Today he runs a small fruit shop in the heart of Milan —
        a job he has done for years with punctuality and dedication, backed by a regular employment contract. When his
        old landlord sold the property and Omar had to find new housing, his search turned into an ordeal.
      </p>
      <p>
        Three months of searching. Dozens of listings ignored. Some visits went well… then silence. His pay stubs were
        in order. His contract was permanent. His income was more than sufficient for the requested rent. And yet.
      </p>
      <p>
        The turning point came with <strong>InquilinoFacile.it</strong>. Omar created his profile, uploaded his last
        three pay stubs and employment contract. The platform verified the documents using AI and generated a profile
        with <strong>HIGH</strong> scoring for rent sustainability and income stability.
      </p>
      <blockquote>
        "The first time I sent the link to my profile to a landlord, he replied within an hour. He didn't want to know
        where I was from — he wanted to know if I could pay the rent. And the system told him clearly."
      </blockquote>
      <p>
        Within <strong>two weeks</strong>, Omar found a home. The same Omar who had been ignored for months, with the
        same money, the same job, the same story — but with objective data in front of the landlord's eyes.
      </p>

      <h2>Why prejudice yields to data</h2>
      <p>
        The problem with discrimination is not always bad faith. Often it's <strong>fear</strong>: fear of choosing the
        wrong person, fear of communication barriers, fear of a defaulting tenant. A fear that, in the absence of
        objective data, fills itself with stereotypes.
      </p>
      <p>
        When a landlord sees a profile with verified documents, certified pay stubs and a transparent reliability
        indicator, that fear diminishes. Not because their prejudices have changed — but because the data speaks
        instead of the name.
      </p>
      <p>
        <strong>InquilinoFacile.it doesn't solve racial discrimination.</strong> But it removes the excuses. A documented
        profile with HIGH scoring is hard to ignore: rejecting it without an objective reason exposes the landlord to
        legal liability.
      </p>

      <h2>How to create a profile that speaks for itself</h2>
      <ol>
        <li><strong>Register for free</strong> on InquilinoFacile.it — no cost for tenants, ever</li>
        <li><strong>Complete the onboarding wizard</strong>: 18 AI-guided steps in Italian or English</li>
        <li><strong>Upload your documents</strong>: pay stubs, employment contract, tax return</li>
        <li><strong>Receive your scoring</strong>: HIGH/MEDIUM/LOW reliability across three objective indicators</li>
        <li><strong>Share the link</strong> to your verified profile with landlords you're interested in</li>
      </ol>
      <p>
        Your data is yours. Share only what you choose. Original documents are never shown to landlords — only
        aggregated, verified indicators.
      </p>

      <h2>What to do if you face discrimination</h2>
      <ul>
        <li><strong>Save evidence</strong>: screenshots of listings, emails, WhatsApp messages with dates and times</li>
        <li>
          <strong>Report to UNAR</strong> (National Office Against Racial Discrimination):{' '}
          <a href="https://www.unar.it" target="_blank" rel="noopener noreferrer">www.unar.it</a> — reporting is free
          and confidential
        </li>
        <li><strong>Contact a CAF or welfare organization</strong> for free legal assistance</li>
        <li>
          <strong>Consider a formal complaint</strong>: Legislative Decree 215/2003 provides for sanctions against
          those who discriminate in access to housing
        </li>
      </ul>
    </>
  )
}
