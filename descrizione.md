# PRD Tecnico Descrittivo – Piattaforma Valutazione Affidabilità Inquilini

## 1. Scopo del Documento

Questo documento descrive in modo dettagliato e operativo i requisiti funzionali e tecnici della piattaforma, in modo che un agente AI di coding possa implementarla senza ambiguità.

La piattaforma consente agli inquilini di creare un profilo verificato e ai locatori di cercare candidati basati su indicatori oggettivi.

---

## 2. Architettura Logica del Sistema

Il sistema è composto da quattro moduli principali:

1. Gestione utenti (inquilini e locatori)
2. Motore AI di onboarding e verifica
3. Sistema di scoring e classificazione
4. Motore di matching tra inquilini e locatori

Ogni modulo deve essere indipendente ma interoperabile tramite API REST.

---

## 3. Modello Utente

### 3.1 Tipi di utente

* TENANT (inquilino)
* LANDLORD (locatore)

### 3.2 Struttura dati utente (base)

```
User {
  id: UUID
  type: "TENANT" | "LANDLORD"
  email: string
  phone: string
  created_at: timestamp
  verified: boolean
}
```

---

## 4. Modello Profilo Inquilino

```
TenantProfile {
  user_id: UUID
  full_name: string
  birth_date: date
  desired_locations: string[]
  max_budget: number
  move_in_date: date
  occupants: number
  has_pets: boolean
  smoker: boolean

  employment_type: string
  monthly_income: number
  contract_type: string
  employment_start_date: date

  has_guarantor: boolean
  guarantor_income: number

  profile_completion: number (0-100)
  verification_status: "NONE" | "PARTIAL" | "VERIFIED"
}
```

---

## 5. Gestione Documenti

### 5.1 Tipologie documenti

* IDENTITY
* PAYSLIP
* EMPLOYMENT_CONTRACT
* TAX_RETURN
* BANK_STATEMENT
* LANDLORD_REFERENCE
* GUARANTOR_DOCUMENT

### 5.2 Struttura dati

```
Document {
  id: UUID
  user_id: UUID
  type: string
  file_url: string
  uploaded_at: timestamp
  verified: boolean
  extracted_data: JSON
}
```

### 5.3 Requisiti

* I file devono essere salvati in storage sicuro
* I documenti devono essere accessibili solo al proprietario e a locatori autorizzati
* Deve essere possibile estrarre dati strutturati dai documenti (OCR + parsing)

---

## 6. Agente AI

### 6.1 Obiettivo

Guidare l’utente nella creazione del profilo e raccogliere dati coerenti e verificabili.

### 6.2 Flusso conversazionale

L’agente deve seguire una sequenza deterministica:

1. Raccolta dati personali
2. Raccolta dati economici
3. Raccolta preferenze abitative
4. Richiesta documenti
5. Verifica coerenza

### 6.3 Logica di validazione

Esempi:

IF monthly_income < (max_budget * 2)
→ suggerire garante

IF document mismatch
→ richiedere correzione

### 6.4 Output agente

```
AIProfileOutput {
  normalized_data: TenantProfile
  inconsistencies: string[]
  missing_documents: string[]
  recommendations: string[]
}
```

---

## 7. Sistema di Scoring

### 7.1 Filosofia

Non usare punteggio numerico globale.

### 7.2 Output

```
Score {
  rent_sustainability: "HIGH" | "MEDIUM" | "LOW"
  income_stability: "HIGH" | "MEDIUM" | "LOW"
  document_reliability: "HIGH" | "MEDIUM" | "LOW"
  profile_completeness: number
}
```

### 7.3 Regole

* rent_sustainability HIGH → affitto <= 30% reddito

* MEDIUM → 30–50%

* LOW → >50%

* document_reliability basato su numero documenti verificati

---

## 8. Motore di Matching

### 8.1 Input

* Parametri immobile
* Filtri locatore

### 8.2 Output

Lista ordinata di candidati

### 8.3 Algoritmo

Matching score basato su:

* compatibilità geografica
* compatibilità budget
* livello affidabilità
* data ingresso

Pseudo-logica:

```
score = 0
IF location_match → +30
IF budget_match → +30
IF high_reliability → +20
IF move_in_match → +20
```

---

## 9. API Principali

### Tenant

* POST /tenant/profile
* GET /tenant/profile
* POST /tenant/documents
* GET /tenant/score

### Landlord

* POST /landlord/property
* GET /landlord/candidates
* POST /landlord/contact-request

---

## 10. Sicurezza

* Autenticazione JWT
* Cifratura documenti
* Controllo accessi per ruolo
* Audit log per accesso documenti

---

## 11. Compliance

### Requisiti obbligatori

* Esplicitare come viene calcolata ogni valutazione
* Consentire modifica manuale dei dati
* Consentire cancellazione dati

### Divieti

* Non usare dati sensibili
* Non automatizzare decisione finale

---

## 12. Flussi principali

### 12.1 Onboarding tenant

```
REGISTER → AI INTERVIEW → DOCUMENT UPLOAD → VALIDATION → SCORE
```

### 12.2 Ricerca landlord

```
CREATE PROPERTY → APPLY FILTERS → VIEW CANDIDATES → CONTACT
```

---

## 13. Requisiti Non Funzionali

* Scalabilità: supportare crescita utenti
* Performance: risposta API < 300ms
* Disponibilità: 99.9%
* Sicurezza: GDPR compliant

---

## 14. Estensioni Future

* Verifica automatica documenti
* Integrazione sistemi antifrode
* Ranking avanzato con explainability

---

## 15. Principio Chiave di Implementazione

Il sistema deve sempre:

* essere spiegabile
* evitare discriminazioni
* mantenere controllo umano

Ogni funzione implementata deve rispettare questi vincoli.
