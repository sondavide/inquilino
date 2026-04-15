# Informativa sul Trattamento dei Dati Personali
### ai sensi degli artt. 13–14 Regolamento (UE) 2016/679 (GDPR)

**Piattaforma:** InquilinoFacile.it  
**Versione:** 1.2  
**Data ultimo aggiornamento:** 15 aprile 2026  

---

## 1. Titolare del Trattamento

Il Titolare del trattamento dei dati personali raccolti tramite la piattaforma InquilinoFacile.it è:

> **[RAGIONE_SOCIALE]**  
> Sede legale: [INDIRIZZO_COMPLETO]  
> C.F. / P.IVA: [CODICE_FISCALE_PIVA]  
> Email privacy: privacy@inquilinofacile.it  
> PEC: [INDIRIZZO_PEC]  

Per qualsiasi questione relativa al trattamento dei tuoi dati personali puoi contattarci all'indirizzo **privacy@inquilinofacile.it**.

> **Nota sul DPO:** Al momento non è stato nominato un Responsabile della Protezione dei Dati (DPO). Prima dell'avvio di operazioni di trattamento su larga scala, sarà condotta una Valutazione d'Impatto sulla Protezione dei Dati (DPIA) ai sensi dell'art. 35 GDPR e sarà valutata la nomina di un DPO ai sensi dell'art. 37 GDPR.

---

## 2. Cos'è InquilinoFacile.it

InquilinoFacile.it è una piattaforma digitale che consente agli **inquilini** di creare un profilo verificato di affidabilità locatizia e ai **locatori e agenzie immobiliari** di ricercare candidati compatibili con i propri immobili, sulla base di indicatori oggettivi e documentabili.

Il profilo dell'inquilino viene costruito attraverso un **wizard conversazionale guidato da intelligenza artificiale** e arricchito con documenti caricati dall'utente, che vengono verificati e utilizzati per generare una classificazione di affidabilità strutturata.

---

## 3. Categorie di Dati Trattati

### 3.1 Dati degli Inquilini (TENANT)

Raccogliamo le seguenti categorie di dati nel corso della registrazione e dell'onboarding:

**Dati anagrafici e di contatto**
- Nome e cognome
- Data e luogo di nascita
- Residenza anagrafica
- Codice fiscale
- Indirizzo email
- Numero di telefono
- Profilo social (se registrazione tramite Google, Facebook o LinkedIn): nome, email, identificativo del provider

**Dati economici e lavorativi**
- Tipo di occupazione (dipendente, autonomo, studente, altro)
- Tipo di contratto di lavoro e data di inizio
- Reddito netto mensile dichiarato
- Eventuale variabilità del reddito
- Presenza e reddito del garante

**Preferenze abitative**
- Zone e città di interesse
- Budget massimo mensile
- Data desiderata di ingresso
- Numero di occupanti dell'immobile
- Presenza di animali domestici
- Preferenza per immobile arredato

**Dati comportamentali abitativi**
- Storico delle precedenti locazioni (dichiarato)
- Presenza di referenze da precedenti locatori

**Documenti caricati**
- Documento di identità (carta d'identità o passaporto)
- Tessera sanitaria / codice fiscale
- Buste paga (ultime 3, per lavoratori dipendenti)
- Contratto di lavoro
- Dichiarazione dei redditi (per lavoratori autonomi)
- Estratti conto bancari
- Documenti del garante
- Lettere di referenza da precedenti locatori

**Dati estratti automaticamente dai documenti**
- Dati strutturati estratti tramite OCR e analisi AI (es. importo reddito, datore di lavoro, date)
- Risultato della verifica di coerenza tra dichiarato e documentato

**Dati conversazionali**
- Trascrizione delle interazioni con il chatbot AI durante l'onboarding
- Step completati, dati raccolti, incongruenze rilevate

### 3.2 Dati dei Locatori e Agenzie (LANDLORD)

- Nome e cognome / ragione sociale
- Email e telefono
- Dati di accesso (se applicabile)
- Caratteristiche degli immobili inseriti (zona, canone, tipologia)
- Filtri di ricerca utilizzati
- Richieste di contatto inviate agli inquilini

### 3.3 Dati di Navigazione (tutti gli utenti)

- Indirizzo IP
- Cookie di sessione (JWT) — vedi [Cookie Policy](cookie-policy.md)
- Log di accesso e attività sulla piattaforma (audit log)

---

## 4. Finalità e Basi Giuridiche del Trattamento

| Finalità | Base giuridica (art. 6 GDPR) |
|----------|------------------------------|
| Registrazione e gestione dell'account | Esecuzione del contratto (art. 6.1.b) |
| Erogazione del servizio di onboarding AI | Esecuzione del contratto (art. 6.1.b) |
| Verifica documenti e coerenza dati | Esecuzione del contratto (art. 6.1.b) |
| Generazione del profilo di affidabilità e scoring | Esecuzione del contratto (art. 6.1.b) |
| Matching con locatori e visibilità del profilo | Consenso esplicito (art. 6.1.a) |
| Condivisione del profilo sintetico con locatori | Consenso esplicito (art. 6.1.a) |
| Sicurezza della piattaforma e audit log | Legittimo interesse (art. 6.1.f) |
| Adempimento obblighi di legge | Obbligo legale (art. 6.1.c) |

### Trattamento relativo alla profilazione automatizzata

Il trattamento di dati economici e documentali ai fini della generazione del profilo di affidabilità costituisce **profilazione** ai sensi dell'art. 4 n. 4 GDPR. La base giuridica è il **consenso esplicito** (art. 6.1.a e art. 22.2.c GDPR), che l'utente presta in modo specifico e informato durante la fase di onboarding.

L'utente può revocare il consenso alla profilazione in qualsiasi momento dalle impostazioni del proprio account, senza che ciò pregiudichi la liceità del trattamento effettuato prima della revoca.

---

## 5. Modalità del Trattamento e Conservazione

I dati sono trattati con strumenti elettronici e logici secondo principi di minimizzazione, correttezza e sicurezza. I documenti caricati sono cifrati a riposo e in transito e conservati su storage sicuro (MinIO, compatibile S3).

**Periodi di conservazione:**

| Categoria di dato | Conservazione |
|-------------------|---------------|
| Dati account attivo | Per tutta la durata del rapporto contrattuale |
| Profilo e documenti | 24 mesi dall'ultimo accesso attivo |
| Log di accesso e audit | 12 mesi |
| Dati post-cancellazione account | 30 giorni (periodo di grazia), poi cancellazione definitiva |
| Dati per adempimenti fiscali/legali | Fino a 10 anni, nei limiti di legge |

---

## 6. Destinatari dei Dati

### 6.1 Locatori e Agenzie (accesso al profilo sintetico)

I locatori e le agenzie abbonate possono visualizzare il **profilo sintetico verificato** dell'inquilino, che include:
- Nome (o iniziali, a scelta dell'utente)
- Classificazione di affidabilità (HIGH / MEDIUM / LOW per ciascun indicatore)
- Preferenze abitative (zone, budget, data ingresso)
- Percentuale di completezza del profilo
- Stato di verifica dei documenti (verificato / parzialmente verificato / non verificato)

I locatori **non hanno accesso** ai documenti originali (buste paga, estratti conto, contratti) né al reddito esatto, salvo consenso aggiuntivo esplicito dell'inquilino.

### 6.2 Responsabili del Trattamento (fornitori tecnici)

Il Titolare si avvale di fornitori che agiscono come Responsabili del Trattamento ex art. 28 GDPR:

| Fornitore | Ruolo | Trasferimento extra-UE |
|-----------|-------|------------------------|
| OpenAI (GPT-4o / GPT-4o-mini) | Elaborazione AI conversazionale e verifica documenti | Sì — USA, con Standard Contractual Clauses (SCC) |
| [PROVIDER_HOSTING] (es. Hetzner) | Hosting infrastruttura | No (UE) |
| [PROVIDER_EMAIL] | Email transazionale | Da valutare |

**Nota OpenAI:** I dati inviati a OpenAI per l'elaborazione AI sono soggetti alla privacy policy di OpenAI. Abbiamo configurato l'API con le opzioni di non utilizzo per training del modello (`opt-out`). Non vengono inviati a OpenAI i documenti originali in chiaro, ma solo i dati estratti strutturati necessari all'elaborazione.

### 6.3 Autorità competenti

I dati possono essere comunicati ad autorità giudiziarie o amministrative ove previsto dalla legge.

---

## 7. Trasferimenti di Dati Extra-UE

Il trasferimento di dati verso OpenAI (USA) avviene sulla base delle **Clausole Contrattuali Standard (SCC)** adottate dalla Commissione Europea (Decisione 2021/914/UE), che garantiscono un livello di protezione adeguato ai sensi del GDPR.

---

## 8. Profilazione e Decisioni Automatizzate

### 8.1 Come funziona la profilazione

InquilinoFacile.it genera un **profilo di affidabilità locatizia** basato esclusivamente su dati economici oggettivi, preferenze dichiarate e documenti caricati dall'utente. La profilazione avviene secondo regole trasparenti e deterministiche (vedi Sezione 9).

### 8.2 Garanzie ex art. 22 GDPR

La piattaforma **non prende decisioni completamente automatizzate** con effetti giuridici o significativi sull'utente. In particolare:

- **Il locatore decide autonomamente** a chi inviare una richiesta di contatto, sulla base del profilo visualizzato.
- **Nessun algoritmo esclude automaticamente** un candidato dalla ricerca.
- Il profilo sintetico è uno **strumento di supporto alla decisione umana**, non un atto decisionale automatizzato.
- L'utente ha sempre il diritto di **richiedere una revisione manuale** del proprio profilo di affidabilità contattando privacy@inquilinofacile.it.

### 8.3 Spiegabilità

Per ogni classificazione, la piattaforma mostra all'utente la motivazione (es. "Sostenibilità canone ALTA perché l'affitto desiderato rappresenta il 25% del reddito mensile verificato"). Vedi Sezione 9 per i criteri completi.

---

## 9. Algoritmo di Scoring e Matching — Trasparenza Completa

Questa sezione descrive in modo integrale come vengono calcolati il profilo di affidabilità e il matching. È pubblicata ai sensi dell'art. 13.2.f GDPR e dell'art. 13 Regolamento UE sull'Intelligenza Artificiale (AI Act).

### 9.1 Indicatori di Affidabilità (Score)

Il sistema genera **tre indicatori categoriali** (ALTA / MEDIA / BASSA) e un indicatore percentuale di completezza. Non esiste un punteggio numerico globale visibile all'esterno.

---

#### 9.1.1 Sostenibilità del Canone (`rent_sustainability`)

Misura la proporzione tra il budget massimo mensile dichiarato dall'inquilino e il **reddito effettivo**, calcolato come segue:

```
reddito_effettivo = reddito_verificato (se presente) oppure reddito_dichiarato
                   + credito_garante (40% del reddito del garante, configurabile)
```

Il **credito del garante** è la quota del reddito del garante (verificato o dichiarato) che contribuisce al reddito effettivo, ponderata al 40% di default (parametro configurabile dall'amministratore tramite template di scoring).

| Livello | Soglia (configurabile) |
|---------|------------------------|
| ALTA    | Budget ≤ 30% del reddito effettivo mensile |
| MEDIA   | Budget tra 30% e 50% del reddito effettivo mensile |
| BASSA   | Budget > 50% del reddito effettivo mensile |

---

#### 9.1.2 Stabilità Reddituale (`income_stability`)

Calcolata come somma di quattro fattori (totale max = 100 punti):

**Fattore A — Base occupazione (max 45 pt)**

| Situazione lavorativa | Punti |
|-----------------------|-------|
| Dipendente a tempo indeterminato | 45 |
| Pensionato | 45 |
| Dipendente a tempo determinato, >18 mesi al termine | 35 |
| Dipendente a tempo determinato, 12–18 mesi al termine | 25 |
| Dipendente a tempo determinato, 6–12 mesi al termine | 15 |
| Apprendistato | 20 |
| Lavoro autonomo / freelance | 30 |
| Stage / tirocinio | 10 |
| Studente con reddito proprio | 10 |
| Studente senza reddito proprio | 5 |

**Fattore B — Continuità occupazione (max 25 pt)**

| Anzianità lavorativa | Punti |
|----------------------|-------|
| > 5 anni | 25 |
| 3–5 anni | 20 |
| 1–3 anni | 12 |
| 6–12 mesi | 6 |
| < 6 mesi | 0 |
| Pensionato | 25 (automatico) |

**Fattore C — Verifica del reddito (max 20 pt)**

| Situazione | Punti |
|------------|-------|
| Reddito corretto/verificato da supervisore | 20 |
| Documenti reddituali approvati (buste paga, 730, ecc.) | 12 |
| Documenti reddituali caricati ma non ancora approvati | 5 |
| Solo dichiarazione verbale | 0 |

**Fattore D — Qualità della rete di sicurezza (max 10 pt)**

Il punteggio è basato sulla **qualità** del garante, determinata dal rapporto tra il reddito complessivo dei garanti (verificato o dichiarato) e il budget mensile massimo scelto dall'inquilino:

```
rapporto_garante = reddito_totale_garanti / budget_mensile_massimo
```

| Qualità garante | Soglia rapporto | Punti |
|-----------------|-----------------|-------|
| ALTA (reddito molto superiore al canone) | rapporto ≥ 4 (o reddito verificato > 2× budget) | 10 |
| MEDIA (reddito adeguato al canone) | rapporto ≥ 2 | 7 |
| BASSA (reddito limitato rispetto al canone) | rapporto ≥ 1 | 4 |
| INSUFFICIENTE (reddito inferiore al canone) | rapporto < 1 | 1 |
| Nessun garante | — | 0 |

Per gli utenti **studenti**, il garante è valutato sia nell'ambito del Fattore D della formula ponderata, sia come componente della formula combinata (score familiare × 70% + score studente × 30%).

Se il budget massimo non è ancora stato dichiarato o è pari a zero, si applica il punteggio minimo di presenza garante (1 pt per garante con reddito, 0 altrimenti).

**Soglie classificazione stabilità** (configurabili):

| Livello | Punteggio totale |
|---------|-----------------|
| ALTA    | ≥ 65/100 |
| MEDIA   | 35–64/100 |
| BASSA   | < 35/100 |

**Formula speciale per studenti:**

Per gli utenti con tipo occupazione STUDENTE, la stabilità viene calcolata come media ponderata tra lo score proprio e lo score del garante (tipicamente un genitore):

```
score_combinato = score_studente × 30% + score_migliore_garante × 70%
```

Le percentuali sono configurabili dall'amministratore. Se non è presente un garante, si usa lo score dello studente ridotto al 30% del peso totale.

---

#### 9.1.3 Affidabilità Documentale (`document_reliability`)

Calcolata come somma pesata dei documenti approvati, con tetto massimo a 100 punti:

| Tipo documento | Punti max |
|----------------|-----------|
| Documento d'identità | 10 |
| Busta paga (singola) | 15 |
| Bonus 3+ buste paga consecutive | +15 (bonus aggiuntivo) |
| 730 / CU (dichiarazione dei redditi) | 25 |
| Contratto di lavoro | 20 |
| Estratto conto bancario | 15 |
| Referenza da locatore precedente | 20 |
| Documento garante | 15 |

I pesi sono configurabili dall'amministratore tramite template di scoring.

**Soglie classificazione affidabilità documentale** (configurabili):

| Livello | Punteggio pesato |
|---------|-----------------|
| ALTA    | ≥ 60/100 |
| MEDIA   | 30–59/100 |
| BASSA   | < 30/100 |

---

#### 9.1.4 Completezza Profilo (`profile_completeness`)

Percentuale (0–100%) dei campi del profilo compilati rispetto al totale previsto per la tipologia lavorativa. Non influenza direttamente gli altri indicatori ma è visibile ai locatori.

---

### 9.2 Override supervisore

Un supervisore umano può modificare manualmente uno o più indicatori categoriali, motivando la decisione. Ogni override è:
- registrato con data, supervisore responsabile e motivazione;
- visibile all'utente su richiesta (art. 22.3 GDPR — diritto di revisione umana);
- reversibile in qualsiasi momento dal supervisore o dall'amministratore.

Il supervisore può inoltre correggere valori numerici (es. reddito mensile, data di inizio lavoro, reddito complessivo dei garanti) quando i documenti presentati dimostrano un valore diverso dal dichiarato. I valori corretti vengono tracciati separatamente dai valori dichiarati.

---

### 9.3 Algoritmo di Matching

Quando un locatore o un'agenzia effettua una ricerca, i profili vengono ordinati (non filtrati in modo esclusivo) sulla base di un punteggio di compatibilità calcolato come segue:

| Criterio | Punti assegnati |
|----------|-----------------|
| Compatibilità geografica (zone di interesse coincidono con l'immobile) | +30 |
| Compatibilità budget (canone immobile ≤ budget massimo inquilino) | +30 |
| Livello di affidabilità complessiva ALTA (almeno 2 indicatori su 3 = ALTA) | +20 |
| Compatibilità data ingresso (±30 giorni) | +20 |
| **Totale massimo** | **100** |

Il punteggio di matching è utilizzato **solo per ordinare la lista** dei candidati compatibili, non per escluderli. Il locatore può visualizzare tutti i profili.

---

### 9.4 Template di Scoring

L'amministratore della piattaforma può creare **template di scoring personalizzati** che ridefiniscono:
- le soglie di classificazione per ciascun indicatore;
- i pesi dei documenti nell'affidabilità documentale;
- la percentuale di credito del garante;
- la ponderazione tra score studente e score garante familiare.

I template sono assegnati ai profili individuali dai supervisori. Il template attivo per un profilo è tracciato e consultabile su richiesta dell'utente.

---

### 9.5 Cosa NON viene utilizzato

Nel rispetto del principio di non discriminazione e del GDPR, i seguenti dati **non influenzano mai** il profilo di affidabilità né il matching:
- Origine etnica, nazionalità o cittadinanza
- Religione o convinzioni personali
- Stato di salute o disabilità
- Orientamento sessuale
- Opinioni politiche
- Genere

---

## 10. Diritti dell'Interessato

Ai sensi degli artt. 15–22 GDPR, hai i seguenti diritti:

| Diritto | Cosa puoi fare |
|---------|----------------|
| **Accesso** (art. 15) | Ottenere copia di tutti i dati che trattiamo su di te |
| **Rettifica** (art. 16) | Correggere dati inesatti o incompleti |
| **Cancellazione** (art. 17) | Richiedere l'eliminazione del tuo account e dei tuoi dati |
| **Limitazione** (art. 18) | Sospendere il trattamento in determinate circostanze |
| **Portabilità** (art. 20) | Ricevere i tuoi dati in formato strutturato e leggibile da macchina |
| **Opposizione** (art. 21) | Opporti al trattamento basato su legittimo interesse |
| **Revoca consenso** (art. 7.3) | Revocare il consenso alla profilazione o alla visibilità del profilo in qualsiasi momento |
| **Revisione umana** (art. 22.3) | Richiedere che una persona fisica riveda il tuo profilo di affidabilità |

Per esercitare i tuoi diritti, scrivi a **privacy@inquilinofacile.it**. Risponderemo entro **30 giorni** dalla ricezione della richiesta (prorogabili di ulteriori 60 giorni per richieste complesse, con comunicazione motivata).

Hai inoltre il diritto di proporre **reclamo al Garante per la Protezione dei Dati Personali** (www.garanteprivacy.it).

---

## 11. Sicurezza dei Dati

Adottiamo le seguenti misure tecniche e organizzative:
- Cifratura dei documenti a riposo (AES-256) e in transito (TLS 1.3)
- Autenticazione con token JWT a scadenza
- Controllo degli accessi basato sui ruoli (RBAC)
- Audit log di ogni accesso ai documenti degli utenti
- Accesso ai dati dei locatori limitato al solo profilo sintetico (non ai documenti originali)
- Separazione logica dei dati tra inquilini e locatori

---

## 12. Minori

Il servizio è riservato a **utenti maggiorenni (≥ 18 anni)**. Non raccogliamo consapevolmente dati di minori. Se vieni a conoscenza di un account intestato a un minore, segnalacelo a privacy@inquilinofacile.it.

---

## 13. Modifiche alla Present Informativa

Ci riserviamo di aggiornare questa informativa. In caso di modifiche sostanziali, gli utenti saranno notificati via email almeno **30 giorni prima** dell'entrata in vigore delle modifiche. L'uso continuato della piattaforma dopo tale data costituisce accettazione della nuova informativa.

---

## 14. Legge Applicabile

La presente informativa è redatta in conformità al **Regolamento (UE) 2016/679 (GDPR)**, al **D.Lgs. 196/2003** (Codice Privacy italiano, come modificato dal D.Lgs. 101/2018) e al **Regolamento (UE) 2024/1689 (AI Act)**. Il foro competente per eventuali controversie è quello del domicilio dell'interessato, salvo diversa previsione di legge.
