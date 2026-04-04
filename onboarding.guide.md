# Onboarding — Guida completa al funzionamento

Documento di riferimento per riprendere rapidamente il contesto del modulo di onboarding dell'applicazione **Inquilino**.

---

## Panoramica

L'onboarding è una procedura guidata conversazionale (chatbot) attraverso cui un tenant (inquilino) costruisce il proprio profilo di affidabilità. Il flusso è composto da **16 step** (numerati 1-16) identificati dai codici `STEP_03` → `STEP_18`. Il bot parla in italiano o inglese in base alla lingua scelta dall'utente.

Al termine l'utente vede una schermata "Complimenti!" e viene reindirizzato all'homepage (`/`).

---

## Architettura tecnica

### Backend (Spring Boot)

```
OnboardingService          → orchestratore principale (streaming LLM, estrazione dati, avanzamento step)
OnboardingStep (interface) → ogni step implementa questa interfaccia
StepRegistry               → registro di tutti gli step, ordinati per stepNumber
OnboardingState (entity)   → stato persistito per utente su PostgreSQL (JSONB)
OnboardingContext          → wrapper di OnboardingState esposto agli step
```

**Flusso per ogni messaggio utente:**

1. `streamChat()` riceve il messaggio e fa partire lo streaming LLM con `buildSystemPrompt()`
2. A streaming completato, chiama `buildExtractionPrompt()` → estrae dati strutturati (JSON) dal messaggio utente
3. Merge dei dati estratti in `OnboardingState.collectedData` (sempre via `new HashMap<>()` per garantire il dirty-detection di Hibernate)
4. `maybeAdvanceStep()` controlla se lo step corrente è completato e avanza al successivo
5. `generateSuggestions()` chiama il LLM una seconda volta (non-streaming) per generare 2-4 chip contestuali basati sulla domanda appena fatta dal bot
6. Invia al frontend l'evento SSE `state` con `OnboardingStateDto`

### Frontend (React + Vite)

```
OnboardingPage.tsx    → pagina principale, gestisce tutto il layout
useChat.ts            → hook che gestisce SSE streaming, stato onboarding, auto-init su cambio step
onboardingApi.ts      → client Axios verso /api/onboarding/*
MapSelector.tsx       → componente mappa per selezione area di interesse
UploadButton.tsx      → pulsante upload con scelta fotocamera / file
```

**Auto-init su cambio step:** quando il backend segnala un cambio di `currentStep`, il frontend rileva la transizione e invia automaticamente un messaggio vuoto (`sendMessage('')`) per far partire il messaggio di apertura del nuovo step — senza richiedere input dall'utente.

**Focus input:** l'`<input>` viene rimesso in focus automaticamente ogni volta che `isStreaming` passa a `false`.

---

## Tabella degli step

| Codice   | N. | Classe Java              | Cosa raccoglie                                              | Completamento                                          |
|----------|----|--------------------------|-------------------------------------------------------------|--------------------------------------------------------|
| STEP_03  | 1  | Step03Identity           | Nome, data nascita, luogo nascita, residenza, codice fiscale | Tutti e 5 i campi presenti                             |
| STEP_04  | 2  | Step04IdentityDocuments  | Upload documento d'identità (CI / passaporto / patente)     | `identity_uploaded = true` AND `identity_verified = true` |
| STEP_05  | 3  | Step05HousingSituation   | Tipo abitazione attuale, affitto pagato, data trasloco       | `current_housing` presente                             |
| STEP_06  | 4  | Step06InterestAreas      | Area geografica di interesse (via MapSelector)              | `interest_areas_confirmed = true`                      |
| STEP_07  | 5  | Step07PropertyPreferences| Budget max, tipo immobile, arredamento                      | `max_budget` + `property_type` presenti                |
| STEP_08  | 6  | Step08Household          | N. occupanti, animali domestici                             | `occupants_count` + `has_pets` presenti                |
| STEP_09  | 7  | Step09Employment         | Tipo lavoro, tipo contratto (se dipendente), data inizio    | Varia per tipo (vedi branching)                        |
| STEP_10  | 8  | Step10Income             | Reddito mensile netto, stabilità reddito                    | `income_variability` presente (+ `monthly_income` se non "none") |
| STEP_11  | 9  | Step11Guarantor          | Presenza garante, nome e reddito garante                    | `has_guarantor` presente (+ dati garante se true)      |
| STEP_12  | 10 | Step12RentalHistory      | Affitti precedenti, referenze                               | `had_previous_rentals` presente (+ `has_references` se true) |
| STEP_13  | 11 | Step13IncomeDocuments    | Upload busta paga / dichiarazione redditi / doc garante     | Almeno un documento caricato **e verificato**          |
| STEP_14  | 12 | Step14OptionalDocuments  | Upload opzionale: referenza locatore, estratto conto        | `optional_docs_step_done = true` (skip o upload)       |
| STEP_15  | 13 | Step15CoherenceCheck     | Verifica coerenza dati raccolti                             | `coherence_check_done = true`                          |
| STEP_16  | 14 | Step16Consents           | Consenso GDPR, consenso condivisione profilo                | `privacy_consent = true` AND `profile_sharing_consent = true` |
| STEP_17  | 15 | Step17FinalReview        | Revisione finale + conferma invio profilo                   | `final_review_confirmed = true`                        |
| STEP_18  | 16 | Step18Completion         | Step terminale — profilo inviato                            | Sempre true (step finale)                              |

---

## Branching logic (step con percorsi condizionali)

### STEP_09 — Tipo di lavoro

| `employment_type`             | Campi richiesti                         |
|-------------------------------|-----------------------------------------|
| `EMPLOYEE`                    | `contract_type` + `employment_start_date` |
| `SELF_EMPLOYED`               | `employment_start_date` (NO contratto)  |
| `STUDENT` / `RETIRED` / `OTHER` | Nessun campo aggiuntivo               |

### STEP_10 — Reddito

Se `income_variability = "none"` → step completato senza chiedere `monthly_income` (studenti, disoccupati).

### STEP_11 — Garante

Se `has_guarantor = false` → step completato immediatamente. Se true → richiede `guarantor_name` + `guarantor_income`.

### STEP_12 — Storico affitti

Se `had_previous_rentals = false` → step completato senza chiedere referenze. Se true → richiede `has_references`.

### STEP_13 — Documenti reddito

Il tipo di documento richiesto varia in base a `employment_type`:
- `SELF_EMPLOYED` → dichiarazione dei redditi (ultimi 2 anni)
- `STUDENT` → documenti reddito del garante
- tutti gli altri → buste paga (ultime 3)

Lo step è completato quando **almeno uno** tra `payslip_verified`, `tax_return_verified`, `guarantor_document_verified` è `true`.

---

## Gestione documenti

Il caricamento documenti avviene tramite `DocumentService` (non tramite chat):

1. `POST /api/onboarding/documents` con `multipart/form-data` (file + type)
2. Il file viene salvato su MinIO (S3-compatible)
3. GPT-4o (multimodale) fa una verifica rapida: "è il documento atteso?"
4. Il risultato viene scritto in `OnboardingState.collectedData`:
   - `{type}_uploaded = true`
   - `{type}_verified = true/false`
   - `{type}_verification_note = "..."` (se fallita)
5. **Dirty detection Hibernate**: la scrittura avviene sempre con `new HashMap<>(existing)` + `state.setCollectedData(newMap)` perché Hibernate 6 con `@JdbcTypeCode(SqlTypes.JSON)` non rileva mutazioni in-place della stessa istanza Map.

---

## Avanzamento step (step manager)

`maybeAdvanceStep()` usa una lista `completedSteps: List<String>` persistita in `OnboardingState`:

- Quando uno step è completato, viene aggiunto a `completedSteps`
- Il chaining automatico (salto di più step consecutivi) avviene **solo** per step già in `completedSteps`
- Questo evita che dati estratti accidentalmente da un altro step causino salti indesiderati

```
Step corrente completato?
  → sì → aggiungi a completedSteps → avanza a nextStep
         → nextStep già in completedSteps? → continua chaining
         → nextStep NON in completedSteps? → fermati (l'utente deve interagire)
  → no → rimani sullo stesso step
```

**Nota sulla guard anti-greetz:** quando si avanza di step, i suggerimenti vengono soppressi (`List.of()`) e vengono rigenerati dal bot solo dopo il suo primo messaggio nel nuovo step.

---

## Suggerimenti contestuali (AI-generated)

I chip suggerimento non sono più statici per step. Dopo ogni risposta del bot:

1. `generateSuggestions(botMessage, locale)` chiama il LLM con il testo esatto appena prodotto
2. Il prompt chiede: "genera 2-4 opzioni di risposta brevi e contestuali"
3. Regola chiave: se la domanda è aperta (nome, data, importo, testo libero) → risponde `[]` → nessun chip
4. Se ci sono scelte discrete (sì/no, selezione tipo, conferma) → genera i chip appropriati

---

## Area di interesse (MapSelector)

Lo step STEP_06 mostra il componente `MapSelector` in sostituzione della barra input. Modalità disponibili:

| Modalità   | Comportamento                                                                     |
|------------|-----------------------------------------------------------------------------------|
| `draw`     | L'utente disegna un poligono libero sulla mappa con il crosshair + "+ Punto"       |
| `anywhere` | Nessuna preferenza geografica — solo la città                                      |

**Confine comunale:** al caricamento, `geocodeCity(residenceAddress)` centra la mappa sull'indirizzo di residenza. Poi `fetchCityBoundary(lat, lng)` chiama `Nominatim /reverse?zoom=12` per ottenere il confine del **comune** (admin_level=8 in Italia). `zoom=12` esclude province (zoom=10) e regioni (zoom=8).

**Salvataggio area:** alla conferma, `onboardingApi.saveInterestArea(area)` chiama `POST /api/onboarding/interest-area` che salva in `tenant_interest_areas`. La colonna `area_geometry geometry(Geometry, 4326)` è generata automaticamente via `ST_GeomFromGeoJSON` (PostGIS) con indice GIST per query spaziali future.

**Query futura:** `GET /api/onboarding/interest-area/tenants-for-apartment?lat=X&lng=Y` restituisce i `userId` dei tenant la cui area include il punto. Usa PostGIS se disponibile, altrimenti JTS in Java come fallback.

---

## Stato persistito (`OnboardingState`)

```java
OnboardingState {
  UUID         id
  User         user              // FK
  String       currentStep       // es. "STEP_09"
  StepStatus   stepStatus        // IN_PROGRESS | COMPLETED | BLOCKED
  Map<String,Object> collectedData   // JSONB — tutti i dati raccolti
  List<String> completedSteps    // JSONB — step già completati dall'utente
  List<String> missingFields     // JSONB — campo opzionale, non usato attivamente
  List<String> pendingActions    // JSONB — campo opzionale
}
```

---

## Dati raccolti (`collectedData` — chiavi complete)

```
full_name, birth_date, birth_place, residence, fiscal_code
identity_uploaded, identity_verified, identity_verification_note
current_housing, pays_rent, current_rent_amount, desired_move_date
interest_areas_confirmed
max_budget, property_type, furnished_preference
occupants_count, has_pets
employment_type, contract_type, employment_start_date
monthly_income, income_variability
has_guarantor, guarantor_name, guarantor_income
had_previous_rentals, has_references
payslip_uploaded, payslip_verified, payslip_verification_note
tax_return_uploaded, tax_return_verified, tax_return_verification_note
guarantor_document_uploaded, guarantor_document_verified
reference_uploaded, bank_statement_uploaded
optional_docs_step_done
coherence_check_done
privacy_consent, profile_sharing_consent
final_review_confirmed
```

---

## Avvio del primo step

Il bot inizia a `STEP_03`. Al primo messaggio (apertura), **prima di chiedere qualsiasi dato**, informa l'utente che serviranno:
1. Documento d'identità (CI, passaporto o patente)
2. Codice fiscale
3. Almeno una busta paga (o equivalente) — può procedere anche senza averla subito

---

## Chat log su MinIO

Dopo ogni interazione viene salvato un file di testo su MinIO:
```
chat-logs/{userId}/onboarding_chat.txt
```
Contiene l'intera conversazione con indicazione degli step completati e i dati raccolti — utile per debug.

---

## API principali

| Endpoint                                              | Descrizione                                       |
|-------------------------------------------------------|---------------------------------------------------|
| `GET  /api/onboarding/state`                          | Stato corrente dell'onboarding                    |
| `POST /api/onboarding/chat` (SSE)                     | Invia messaggio, riceve token+state in streaming   |
| `POST /api/onboarding/back`                           | Torna allo step precedente                        |
| `POST /api/onboarding/documents`                      | Upload documento (multipart)                      |
| `GET  /api/onboarding/documents`                      | Lista documenti caricati                          |
| `POST /api/onboarding/interest-area`                  | Salva area di interesse dalla mappa               |
| `GET  /api/onboarding/interest-area/tenants-for-apartment?lat=X&lng=Y` | Tenant interessati a una posizione |

---

## Problemi risolti e decisioni tecniche da ricordare

| Problema                                          | Soluzione                                                                                   |
|---------------------------------------------------|---------------------------------------------------------------------------------------------|
| Hibernate non rileva mutazioni in-place su JSONB  | Sempre `new HashMap<>(old)` + `setState(newMap)` — mai mutare la stessa istanza             |
| `Boolean.FALSE` trattato come "non presente"      | `hasData()` ritorna `true` per qualsiasi `Boolean`, anche `false`                           |
| STEP_09 bloccato per SELF_EMPLOYED                | `isCompleted()` usa switch su `employment_type` — autonomi non hanno `contract_type`        |
| Suggerimenti non coerenti con la domanda          | Generati dall'LLM dopo ogni risposta del bot, basati sul testo effettivo prodotto            |
| Confine comunale mostra la provincia              | Nominatim `/reverse?zoom=12` invece di `/search` — zoom=12 = admin_level=8 (comune)        |
| `Object areaGeojson` causa ClassCastException     | Cambiato in `Map<String, Object>` su entità e DTO — Hibernate gestisce correttamente        |
| PostGIS non installato localmente                 | Migrazione V5 wrapped in `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE NOTICE $$`      |
| Docker senza PostGIS                              | Immagine cambiata in `postgis/postgis:17-3.5-alpine` nel docker-compose                     |
