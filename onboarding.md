# AI Onboarding Wizard – PRD per Agente di Coding

## 1. Scopo

Questo documento descrive in modo strutturato e implementabile un sistema di onboarding per inquilini basato su **chatbot AI conversazionale**.

L’intero wizard NON è una form tradizionale, ma una **sequenza di step guidati da un agente AI**, che:

* pone domande in linguaggio naturale
* interpreta le risposte
* estrae dati strutturati
* richiede documenti
* verifica coerenza
* costruisce un profilo affidabilità

---

## 2. Principio Architetturale

### 2.1 Chatbot-first UI

Tutti gli step devono essere eseguiti tramite chatbot.

Il chatbot deve:

* guidare l’utente step-by-step
* fare UNA domanda alla volta (max 2 correlate)
* adattare le domande in base alle risposte precedenti
* validare input in tempo reale
* richiedere documenti quando necessario
* spiegare cosa serve e perché

### 2.2 Stato Conversazionale

Il sistema NON deve essere stateless.

Ogni utente ha uno stato:

```
OnboardingState {
  user_id: UUID
  current_step: string
  step_status: enum(not_started, in_progress, completed, blocked)
  collected_data: JSON
  missing_fields: string[]
  pending_actions: string[]
}
```

---

## 3. Flusso Globale

```
ENTRY → REGISTRATION → IDENTITY → PROFILE → DOCUMENTS → VERIFICATION → REVIEW → COMPLETION
```

---

## 4. Comportamento Chatbot

### 4.1 Input utente

* testo libero
* selezione opzioni
* input numerico
* upload file

### 4.2 Output chatbot

* domanda successiva
* conferma dati
* richiesta documenti
* segnalazione incongruenze

### 4.3 Regole

* evitare domande lunghe
* evitare blocchi
* sempre suggerire next step

---

## 5. Struttura Step

Ogni step è definito così:

```
Step {
  step_id: string
  title: string
  goal: string
  required: boolean
  fields: Field[]
  completion_condition: function
  next_step_logic: function
}
```

---

## 6. STEP DETTAGLIATI

## STEP 0 — Entry

Goal: scelta login/registrazione

Output atteso:

```
entry_action: login | register
```

---

## STEP 1 — Metodo registrazione

Chatbot deve chiedere:

* Vuoi registrarti manualmente o usare Google/Apple/SPID?

Output:

```
registration_method: manual | google | apple | spid
```

---

## STEP 2 — Creazione account

Campi:

* email
* telefono
* password (se manual)
* consensi

Validazioni:

* email valida
* telefono valido

---

## STEP 3 — Identità base

Campi:

* nome
* cognome
* data nascita
* luogo nascita
* residenza
* codice fiscale (OBBLIGATORIO)

Chatbot deve:

* validare codice fiscale
* chiedere conferma se mismatch

---

## STEP 4 — Documenti identità

Richiesta chatbot:

* carica documento identità
* carica codice fiscale

Sistema deve:

* estrarre dati
* confrontare con input

---

## STEP 5 — Situazione abitativa

Domande:

* Dove vivi ora?
* Paghi affitto?
* Quando vuoi trasferirti?

---

## STEP 6 — Aree di interesse

Chatbot deve:

* chiedere città/quartieri
* proporre autocomplete
* permettere più aree

Output:

```
interest_areas: []
```

---

## STEP 7 — Preferenze immobile

Domande:

* Budget massimo
* Tipo immobile
* Arredato sì/no

---

## STEP 8 — Nucleo abitativo

Domande:

* Quante persone?
* Animali?

---

## STEP 9 — Lavoro

Chatbot deve capire tipo:

* dipendente
* autonomo
* studente

Domande adattive

---

## STEP 10 — Reddito

Domande:

* reddito netto mensile
* variabilità

Validazioni:

* coerenza con budget

---

## STEP 11 — Garante

Domande:

* hai un garante?

Branching:

* se sì → sub-flow

---

## STEP 12 — Storico affitti

Domande:

* hai già affittato?
* referenze?

---

## STEP 13 — Documenti reddito

Chatbot deve richiedere:

Dipendente:

* buste paga

Autonomo:

* dichiarazione redditi

Studente:

* documenti garante

---

## STEP 14 — Documenti opzionali

* referenze
* lettere

---

## STEP 15 — Verifica coerenza

Sistema deve:

* confrontare dati dichiarati vs documenti

Chatbot deve:

* chiedere correzione

---

## STEP 16 — Consensi

Campi:

* privacy
* condivisione profilo

---

## STEP 17 — Review finale

Chatbot mostra:

* riepilogo
* dati mancanti

---

## STEP 18 — Completamento

Output:

```
profile_status: submitted | verified
```

---

## 7. MODELLO DATI OUTPUT

```
TenantProfile {
  personal_data: {}
  housing_preferences: {}
  employment: {}
  income: {}
  documents: []
  claims: []
  verification: {}
}
```

---

## 8. REGOLE CORE

* chatbot guida tutto
* backend valida tutto
* AI non decide punteggi finali
* ogni dato deve essere tracciabile

---

## 9. ERROR HANDLING

* retry automatico
* fallback manuale
* escalation umana

---

## 10. OBIETTIVO FINALE

Produrre un profilo inquilino:

* strutturato
* verificabile
* spiegabile

---

## 11. NOTE PER IMPLEMENTAZIONE

* mobile-first
* multilingua
* autosave continuo
* resume sessione

---

FINE DOCUMENTO
