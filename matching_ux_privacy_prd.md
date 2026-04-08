# PRD – UX, Privacy, Regole di Matching e Algoritmo per Marketplace Inquilini–Immobili

## 1. Scopo

Questo documento definisce:

- regole UX per la visualizzazione di immobili e profili inquilino
- regole privacy-by-design
- algoritmo di matching consigliato
- stati del match
- regole di esposizione dati lato inquilino e lato locatore
- principi per il contatto tra le parti

Il documento è pensato per essere utilizzato da un agente AI di coding per sviluppare:

- experience lato inquilino
- experience lato locatore
- motore di matching
- regole di visibilità
- flusso di contatto e consenso
- logica di ranking e privacy gating

---

## 2. Obiettivo di prodotto

La piattaforma non deve comportarsi come un portale immobiliare tradizionale in cui:

- l'inquilino vede tutto subito
- il locatore riceve candidature massive
- i dati personali vengono esposti troppo presto

La piattaforma deve invece:

- mostrare agli inquilini immobili reali e desiderabili
- proteggere la privacy del locatore e dell'immobile nella fase iniziale
- mostrare ai locatori profili inquilino utili ma anonimi
- consentire contatto e disclosure progressiva solo dopo segnali di interesse e/o consenso

---

## 3. Principi UX principali

### 3.1 Principio 1 – Appeal visivo immediato lato inquilino
L'inquilino deve poter vedere subito:
- foto dell'immobile
- fascia di prezzo
- quartiere / via senza civico
- elementi essenziali dell'immobile
- punti di forza sintetici

Questo perché il desiderio di approfondire nasce quasi sempre da:
- immagini
- localizzazione comprensibile
- percezione del valore

### 3.2 Principio 2 – Privacy dell'immobile
L'annuncio non deve mostrare immediatamente:
- numero civico
- punto preciso in mappa
- nome completo del proprietario
- recapiti diretti del locatore

La posizione deve essere mostrata in forma controllata:
- via senza civico, oppure
- quartiere + via parziale, oppure
- area approssimata su mappa

### 3.3 Principio 3 – Privacy del profilo inquilino
Il locatore non deve vedere subito:
- nome e cognome
- telefono
- email
- indirizzo di residenza
- codice fiscale
- documenti
- datore di lavoro identificabile, salvo sblocco/consenso successivo

Il locatore deve vedere:
- indicatori sintetici
- range e categorie
- affidabilità documentale
- compatibilità economica
- note descrittive neutre
- aree di interesse in forma aggregata

### 3.4 Principio 4 – Disclosure progressiva
Tutte le informazioni sensibili devono seguire un modello a livelli:

- livello 0: match anonimo
- livello 1: dettaglio sintetico
- livello 2: interesse espresso
- livello 3: reciprocità / invito
- livello 4: contatto sbloccato

### 3.5 Principio 5 – Riduzione dello spam
La UX deve evitare:
- candidature massicce
- contatti inutili
- locatori sommersi da lead non qualificati
- inquilini esposti senza controllo

---

## 4. UX lato inquilino

## 4.1 Lista immobili

Ogni card immobile deve mostrare:

- foto cover
- galleria con 3–10 immagini
- titolo annuncio
- canone mensile
- spese principali se disponibili
- via senza civico oppure quartiere + via
- distanza stimata rispetto all'area di interesse scelta
- caratteristiche principali:
  - metratura
  - locali
  - bagni
  - piano
  - arredato sì/no
- badge di compatibilità:
  - prezzo compatibile
  - area compatibile
  - disponibile da data coerente
- breve descrizione di valore, ad esempio:
  - "vicino alla metro"
  - "luminoso"
  - "ristrutturato"
  - "ideale per contratto transitorio"

### Non mostrare in lista:
- civico
- punto esatto in mappa
- contatto diretto
- nome locatore
- note troppo dettagliate che permettono re-identificazione precisa

---

## 4.2 Dettaglio immobile lato inquilino

Il dettaglio immobile deve mostrare:

### Sezione visiva
- foto complete
- planimetria se presente
- video o virtual tour se presente

### Sezione localizzazione
- via senza civico oppure indirizzo approssimato
- quartiere
- città
- mappa con marker approssimato, non preciso
- testo tipo:
  - "l'immobile si trova in Via X, zona Y"
  - "la posizione esatta sarà condivisa in fase di contatto"

### Sezione descrittiva
- descrizione sintetica completa
- potenzialità dell'immobile
- dotazioni
- disponibilità
- regole immobile
- classe energetica e dati obbligatori

### Sezione compatibilità con il profilo utente
- compatibile con il tuo budget
- leggermente sopra budget ma entro margine tollerato
- vicino a una delle tue aree
- disponibilità compatibile con la tua data ingresso

### CTA lato inquilino
- salva
- non mi interessa
- sono interessato

### Non mostrare:
- indirizzo completo
- nominativo locatore
- telefono/email locatore
- documento identificativo del proprietario/agenzia salvo casi specifici di pagina legale

---

## 4.3 Mappa lato inquilino

La mappa deve essere utile ma non troppo precisa.

### Regola consigliata
Mostrare:
- marker approssimato
- cluster di area
- poligono zona
- raggio di prossimità

### Non mostrare:
- marker esatto della proprietà in fase iniziale

### Strategie possibili
- jitter casuale controllato entro 150–300 metri in area urbana
- centro del quartiere
- segmento via senza civico
- heat area invece del punto

### Regola UX
L'utente deve percepire:
- dove si trova l'immobile in modo utile
- senza poter identificare con certezza il portone

---

## 5. UX lato locatore

## 5.1 Lista profili inquilino

Ogni card profilo deve mostrare:

- identificativo anonimo, es. `Profilo #T-2041`
- fascia budget cercata
- aree di interesse aggregate
- data ingresso desiderata
- composizione nucleo:
  - 1 persona
  - coppia
  - famiglia
  - coinquilini
- occupazione in forma sintetica:
  - dipendente
  - autonomo
  - studente
  - pensionato
- stabilità lavorativa in classe
- sostenibilità canone in classe
- verifica documentale in classe
- presenza garante sì/no
- animali sì/no
- badge compatibilità con l'immobile
- descrizione sintetica anonima, ad esempio:
  - "profilo con reddito verificato e data di ingresso compatibile"
  - "profilo con garante e buona compatibilità geografica"

### Non mostrare:
- nome e cognome
- contatti
- indirizzo di residenza
- datore di lavoro nominativo
- documenti
- codice fiscale
- dettagli identificativi puntuali

---

## 5.2 Dettaglio profilo inquilino lato locatore

Il dettaglio profilo deve mostrare solo dati pseudonimizzati o aggregati.

### Sezione identità sintetica
- ID profilo
- lingua principale
- fascia età:
  - 18–24
  - 25–34
  - 35–44
  - 45–54
  - 55+
- situazione abitativa attuale in forma non identificativa

### Sezione abitativa
- aree di interesse in forma geografica aggregata
- budget massimo
- budget ideale
- data ingresso
- durata contratto desiderata
- tipo immobile cercato

### Sezione economica
- fascia reddito netto verificato o dichiarato/verificato:
  - 0–1200
  - 1200–1800
  - 1800–2500
  - 2500–3500
  - 3500+
- rapporto canone/reddito stimato per questo immobile
- presenza di altre entrate ricorrenti
- deposito sostenibile in mesi

### Sezione affidabilità
- identità verificata: sì/no/parziale
- reddito verificato: sì/no/parziale
- stabilità lavorativa: alta/media/bassa
- documentazione: completa/media/incompleta
- storico locativo: disponibile/non disponibile
- garante: sì/no

### Sezione descrittiva sintetica
Testo generato dal sistema, neutro e non identificativo:
- "inquilino singolo con disponibilità da giugno, budget coerente e documentazione quasi completa"
- "coppia con garante, orientata a bilocale arredato in zona semicentrale"

### CTA lato locatore
- salva profilo
- non interessante
- segnala interesse
- invita al contatto
- richiedi reciprocità

### Non mostrare:
- nome
- foto volto
- contatti
- documenti originali
- informazioni non necessarie
- dettagli che permettono re-identificazione immediata

---

## 6. Regole privacy-by-design

## 6.1 Immobile
Visibilità iniziale consentita:
- foto
- prezzo
- quartiere / via senza civico
- caratteristiche
- descrizione
- posizione approssimata

Visibilità iniziale non consentita:
- civico
- marker esatto
- dati di contatto
- documenti legali dell'inserzionista
- coordinate precise lato frontend

## 6.2 Inquilino
Visibilità iniziale consentita:
- indicatori
- categorie
- range economici
- descrizione sintetica anonima
- aree cercate in forma aggregata

Visibilità iniziale non consentita:
- nome/cognome
- email/telefono
- codice fiscale
- residenza precisa
- documenti
- informazioni sensibili
- dati che permettano discriminazione o identificazione immediata

## 6.3 Disclosure progressiva
La rivelazione dati deve essere progressiva e basata su stato.

### Livello 0 – Matching anonimo
Entrambe le parti vedono solo dati sintetici.

### Livello 1 – Interesse unilaterale
Una parte esprime interesse.
L'altra parte vede che esiste interesse, ma non riceve dati personali completi.

### Livello 2 – Interesse reciproco o invito accettato
Si può sbloccare:
- chat interna
- posizione più precisa per visita
- ulteriori dettagli del profilo

### Livello 3 – Contatto autorizzato
Si possono sbloccare:
- contatti
- indirizzo esatto per visita
- eventuali documenti aggiuntivi autorizzati

---

## 7. Regole di matching – hard filters

Le regole di matching devono essere divise in:
- hard filters
- soft ranking signals

Un match esiste solo se supera tutti gli hard filters applicabili.

## 7.1 Regola geografica
L'immobile è compatibile se dista al massimo 5 km da almeno una area di interesse dell'utente.

### Formula logica
Per ogni area utente:
- se l'area è un punto: distanza tra `listing.location_point` e `user_interest.point` <= 5000 metri
- se l'area è un poligono: distanza tra `listing.location_point` e `user_interest.geometry` <= 5000 metri
- se l'immobile è dentro il poligono: compatibile

### Output consigliato
- `geo_match = true/false`
- `geo_distance_meters`
- `matched_interest_area_id`

## 7.2 Regola prezzo
L'immobile è compatibile se il prezzo è al massimo il 10% sopra il budget massimo dell'utente.

### Formula
`listing.monthly_rent <= user.max_budget * 1.10`

### Output consigliato
- `price_match = true/false`
- `price_delta_percentage`
- `price_band = within_budget | within_tolerance | over_budget`

## 7.3 Regola disponibilità temporale
Da aggiungere come hard filter se la piattaforma la considera essenziale.

Esempio:
- l'immobile deve essere disponibile entro una finestra coerente con `user.desired_move_in_date`

Formula esempio:
- differenza tra `listing.available_from` e `user.desired_move_in_date` <= 45 giorni

## 7.4 Regola tipologia immobile
L'immobile deve appartenere a una tipologia compatibile con quelle selezionate dall'utente.

Esempio:
- l'utente cerca `room` o `apartment`
- l'annuncio è `garage`
- il match non esiste

---

## 8. Segnali di ranking – soft signals

I soft signals non escludono, ma ordinano i risultati.

## 8.1 Geo score
Punteggio più alto se:
- immobile dentro area prioritaria
- distanza minore
- quartiere prioritario

## 8.2 Price score
Punteggio più alto se:
- prezzo entro budget ideale
- prezzo entro budget massimo
- prezzo vicino alla soglia ideale

## 8.3 Timing score
Punteggio più alto se:
- disponibilità immobile molto vicina alla data desiderata

## 8.4 Fit score
Punteggio più alto se:
- arredato come richiesto
- animali ammessi se necessari
- durata contratto compatibile
- numero occupanti compatibile
- ascensore/piano compatibili
- stanza/appartamento coerente

## 8.5 Tenant strength score (solo lato locatore)
Punteggio più alto se:
- reddito verificato
- documenti completi
- presenza garante
- rapporto canone/reddito buono
- identità verificata

---

## 9. Algoritmo consigliato

## 9.1 Pipeline
1. Recupera immobili candidati per area
2. Applica hard filters
3. Calcola soft scores
4. Genera `match_score`
5. Applica privacy rules alla vista utente/locatore
6. Ordina risultati
7. Mostra CTA coerenti con lo stato del match

## 9.2 Formula semplice consigliata per MVP

```text
match_score =
  geo_score * 0.35 +
  price_score * 0.30 +
  timing_score * 0.15 +
  fit_score * 0.20
```

### Variante lato locatore
```text
match_score_landlord =
  geo_score * 0.20 +
  price_score * 0.20 +
  timing_score * 0.10 +
  fit_score * 0.20 +
  tenant_strength_score * 0.30
```

## 9.3 Bande di compatibilità
- `excellent_match`: score >= 85
- `good_match`: 70–84
- `medium_match`: 55–69
- `weak_match`: 40–54
- sotto 40 non mostrare o mostrare solo su richiesta avanzata

---

## 10. Flusso consigliato tra inquilino e locatore

Il modello corretto è **bilaterale con disclosure progressiva**.

## 10.1 Stato 1 – Match algoritmico
- il sistema rileva compatibilità
- nessuna parte ha ancora espresso interesse

## 10.2 Stato 2 – Interesse unilaterale
- l'inquilino mette "sono interessato"
oppure
- il locatore mette "profilo interessante"

## 10.3 Stato 3 – Interesse reciproco / invito accettato
- entrambe le parti mostrano interesse
oppure
- una parte invita e l'altra accetta

## 10.4 Stato 4 – Contatto sbloccato
- si apre chat interna
- si possono sbloccare dati aggiuntivi
- il locatore può condividere posizione più precisa
- l'inquilino può condividere dati aggiuntivi o documenti selettivi

---

## 11. UX delle CTA

## 11.1 CTA lato inquilino
- `salva`
- `non mi interessa`
- `sono interessato`
- `richiedi maggiori dettagli` (solo in stati avanzati)
- `accetta invito`

## 11.2 CTA lato locatore
- `salva profilo`
- `non interessante`
- `segnala interesse`
- `invita al contatto`
- `sblocca dettagli` (solo se policy e consenso lo consentono)

### Regola UX
La CTA primaria non deve essere "chiama" o "scrivi direttamente" nelle prime fasi.
La CTA primaria deve essere orientata al consenso e al matching.

---

## 12. Contenuto sintetico generato automaticamente

Il sistema deve generare descrizioni UX brevi e utili.

## 12.1 Per immobili
Esempi:
- "Bilocale arredato in zona servita, compatibile con il tuo budget"
- "Stanza singola vicino ai mezzi, disponibile da settembre"
- "Appartamento luminoso in area coerente con una delle tue preferenze"

## 12.2 Per profili
Esempi:
- "Profilo singolo con budget coerente e documentazione verificata"
- "Coppia con garante e disponibilità da luglio"
- "Studente con supporto familiare e preferenza per contratto transitorio"

### Regole
- niente dati identificativi
- niente inferenze sensibili
- tono neutro
- massimo 160–220 caratteri per card

---

## 13. Strutture dati consigliate

## 13.1 Match record
```json
{
  "match_id": "uuid",
  "listing_id": "uuid",
  "tenant_profile_id": "uuid",
  "geo_match": true,
  "price_match": true,
  "timing_match": true,
  "property_type_match": true,
  "geo_distance_meters": 0,
  "price_delta_percentage": 0,
  "geo_score": 0,
  "price_score": 0,
  "timing_score": 0,
  "fit_score": 0,
  "tenant_strength_score": 0,
  "match_score_tenant": 0,
  "match_score_landlord": 0,
  "match_band": "excellent_match | good_match | medium_match | weak_match",
  "match_state": "algorithmic | tenant_interested | landlord_interested | mutual_interest | contact_unlocked | archived",
  "tenant_interest_at": null,
  "landlord_interest_at": null,
  "contact_unlocked_at": null
}
```

## 13.2 Privacy exposure policy
```json
{
  "viewer_type": "tenant | landlord",
  "match_state": "algorithmic | tenant_interested | landlord_interested | mutual_interest | contact_unlocked",
  "visible_fields": []
}
```

---

## 14. Regole di visibilità consigliate

## 14.1 Tenant viewing listing
### Stato algorithmic
Mostra:
- foto
- prezzo
- quartiere / via senza civico
- posizione approssimata
- dettagli immobile

Non mostrare:
- civico
- contatti
- coordinate esatte

### Stato mutual_interest / contact_unlocked
Può mostrare:
- posizione più precisa
- modalità di visita
- contatti intermediati dalla piattaforma

## 14.2 Landlord viewing tenant profile
### Stato algorithmic
Mostra:
- indicatori
- descrizioni sintetiche
- range economici
- aree aggregate
- stato verifica

Non mostrare:
- nome
- contatti
- documenti
- dettagli identificativi

### Stato contact_unlocked
Può mostrare gradualmente:
- nome
- contatto
- documenti selezionati
- dettagli più precisi del profilo

---

## 15. Scelte UX consigliate finali

## 15.1 Lato inquilino
L'inquilino deve sentire che:
- sta sfogliando immobili reali e desiderabili
- ha abbastanza contesto per decidere
- la posizione è comprensibile ma non eccessivamente precisa
- il processo di interesse è semplice

## 15.2 Lato locatore
Il locatore deve sentire che:
- sta vedendo profili seri
- riceve pochi profili ma buoni
- può valutare senza ricevere dati sensibili troppo presto
- mantiene controllo sul contatto

## 15.3 Bilanciamento corretto
La UX non deve essere:
- troppo chiusa lato inquilino
- troppo invadente lato locatore

La soluzione corretta è:
- appeal forte sugli immobili
- anonimizzazione forte sui profili
- sblocco progressivo del contatto

---

## 16. Obiettivo implementativo

L'agente AI di coding deve usare questo documento per sviluppare:

- regole di rendering card/lista/dettaglio
- privacy gating per annunci e profili
- algoritmo di matching
- stati del match
- CTA per espressione interesse
- disclosure progressiva
- logica di ranking e ordinamento
- supporto geospaziale e di distanza
