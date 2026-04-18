# Flusso Agenzie Immobiliari — Registrazione, Validazione e Casi d'Uso

> Ultima revisione: 2026-04-18

---

## 1. Attori e Ruoli

| Ruolo | `UserType` DB | Descrizione |
|---|---|---|
| **Owner agenzia** | `AGENCY` | Si registra, gestisce il profilo, invita operatori, pubblica annunci |
| **Operatore** | `AGENCY_OPERATOR` | Membro del team dell'agenzia; può gestire annunci nel proprio scope |
| **Admin** | `SUPERADMIN` | Approva, rifiuta, sospende agenzie; assegna le aree di pertinenza |

---

## 2. Registrazione dell'Agenzia

### 2.1 Percorso utente

```
/register  →  scelta ruolo  →  /register/agency  →  step 1 (form)  →  step 2 (OTP)  →  /agency/profile
```

### 2.2 Step 1 — Compilazione form

L'owner compila il form su `RegisterAgencyPage`:

| Campo | Obbligatorio | Note |
|---|---|---|
| Ragione sociale (`agencyName`) | Sì | |
| Partita IVA (`vatNumber`) | No | |
| Numero REA (`reaNumber`) | No | |
| Sito web (`websiteUrl`) | No | URL validato (`type="url"`) |
| Email di accesso (`email`) | Sì | Usata per il login |
| Telefono di contatto (`contactPhone`) | No | |
| Password + conferma | Sì | `minLength=8`, match obbligatorio |
| Telefono personale (`phone`) | No | |
| Consenso Privacy / Cookie / ToS | Sì | Checkbox obbligatorio |

Al submit il frontend chiama:
```
POST /api/auth/request-email-verification   { email }
```
Se `409 Conflict` → email già registrata.  
Se ok → si passa allo **Step 2**.

### 2.3 Step 2 — Verifica email (OTP)

- L'utente riceve un codice a 6 cifre per email.
- Inserisce il codice nell'input OTP.
- Al submit il frontend chiama:

```
POST /api/auth/register/agency
{
  email, password, phone?,
  agencyName, vatNumber?, reaNumber?, websiteUrl?, contactPhone?,
  verificationCode
}
```

| HTTP status | Significato |
|---|---|
| `200` | Registrazione ok → risponde `{ token, userId, email }` |
| `409` | Email duplicata |
| `422` | OTP non valido o scaduto |

Il token JWT viene salvato via `setToken()` e l'utente viene reindirizzato a `/agency/profile`.

### 2.4 Stato iniziale

L'account viene creato con:
- `status = PENDING_APPROVAL`
- `areas = []` (nessuna area di pertinenza)
- Nessun operatore associato

---

## 3. Ciclo di Vita dell'Agenzia (`AgencyStatus`)

```
         Registrazione
              │
              ▼
    ┌─────────────────────┐
    │   PENDING_APPROVAL  │ ◄─── reject (ritorna a pending con nota)
    └─────────────────────┘
              │ approve
              ▼
         ┌────────┐
         │ ACTIVE │ ──────── suspend ──────► SUSPENDED
         └────────┘                              │
              ▲                                  │ approve
              └──────────────────────────────────┘
```

| Transizione | API Admin | Effetto |
|---|---|---|
| `approve` | `POST /api/admin/agencies/{id}/approve` | `status → ACTIVE`, `approvedAt` impostato, notifica inviata |
| `reject` | `POST /api/admin/agencies/{id}/reject` `{ note }` | `status → PENDING_APPROVAL`, `statusNote` salvata, notifica inviata |
| `suspend` | `POST /api/admin/agencies/{id}/suspend` `{ note }` | `status → SUSPENDED`, `statusNote` salvata, notifica inviata |

---

## 4. Validazione da Parte dell'Admin

### 4.1 Lista agenzie (`AgencyManagementPage`)

L'admin accede a `/admin/agencies` e vede la lista filtrabile per status (`PENDING_APPROVAL` / `ACTIVE` / `SUSPENDED` / tutti).

API:
```
GET /api/admin/agencies?status=PENDING_APPROVAL&page=0&size=20
→ Page<AgencyProfileSummaryDto>
```

Ogni riga mostra: ragione sociale, email, P.IVA, data registrazione, data approvazione, nota di stato.

### 4.2 Azioni disponibili

| Status corrente | Azioni visibili |
|---|---|
| `PENDING_APPROVAL` | Approva · Rifiuta · Aree di pertinenza |
| `ACTIVE` | Sospendi · Aree di pertinenza |
| `SUSPENDED` | Approva · Aree di pertinenza |

**Rifiuta / Sospendi** aprono un modal per inserire una nota obbligatoria (`statusNote`).

### 4.3 Assegnazione delle aree di pertinenza

Le aree vengono assegnate **esclusivamente dall'admin**. L'agenzia non può modificarle.

Il pannello "Aree di pertinenza" per ogni riga admin include:
1. **AreaSearch** — barra di ricerca Nominatim (OSM), filtra solo Italia (`countrycodes=it`), restituisce risultati di tipo `COMUNE`, `PROVINCIA`, `REGIONE`
2. **AgencyAreaMap** — mappa Leaflet che mostra i poligoni GeoJSON delle aree selezionate (fetchati da Nominatim lookup con `polygon_geojson=1`)
3. **Lista aree** — badge colorato per tipo + nome + bottone rimozione
4. **Pulsante Salva** — chiama:

```
PATCH /api/admin/agencies/{id}/areas
{ "areas": [ { type, name, osmId, osmType, displayName, boundingBox } ] }
```

**Doppio storage:**

| Store | Formato | Scopo |
|---|---|---|
| `agency_profiles.areas` | JSONB `List<Map>` | Lettura rapida nel profilo e nella UI |
| `agency_areas` (PostGIS) | `geometry(Geometry,4326)` | Query spaziali `ST_Intersects` per matching annunci/tenant |

Il bounding box (`[south, north, west, east]`) viene convertito in un rettangolo JTS e persistito in `agency_areas`.

---

## 5. Profilo dell'Agenzia (`/agency/profile`)

Accessibile a `AGENCY` e `AGENCY_OPERATOR` (in sola lettura per i campi sensibili).

### 5.1 Sezione "Profilo"

L'owner (`AGENCY`) può modificare:
- Ragione sociale, P.IVA, REA, sito web, email di contatto, telefono di contatto

API:
```
PATCH /api/agency/profile
{ agencyName?, vatNumber?, reaNumber?, websiteUrl?, contactEmail?, contactPhone? }
→ AgencyProfileResponse
```
Richiede `status = ACTIVE`.

### 5.2 Sezione "Aree di pertinenza" (sola lettura)

L'agenzia vede:
- Nota informativa (le aree sono assegnate dall'admin)
- Mappa Leaflet con i poligoni delle aree assegnate
- Lista delle aree con badge tipo (Comune / Provincia / Regione)

Non è presente nessun controllo di modifica.

### 5.3 Banner di stato

- `PENDING_APPROVAL` → banner ambra "Account in attesa di approvazione"
- `SUSPENDED` → banner rosso con motivo della sospensione

---

## 6. Gestione Operatori

### 6.1 Invito operatore

L'owner (`AGENCY`, `status = ACTIVE`) può invitare operatori dalla pagina `/agency/operators`.

```
POST /api/agency/operators
{ email, displayName, listingScope?: UUID[] | null }
```

Comportamenti:
- Se l'email **non esiste** nel sistema → crea un nuovo utente `AGENCY_OPERATOR` (senza password) e invia un link di invito via `PasswordResetService.sendOperatorInvite()`
- Se l'email **esiste già** come `AGENCY_OPERATOR` non ancora in un'agenzia → crea la membership
- Se l'email è già registrata con altro ruolo → `409 Conflict`
- Se l'operatore è già in un'altra agenzia → `409 Conflict`

### 6.2 Struttura della membership

```sql
agency_memberships (
  id               UUID PK,
  agency_user_id   UUID FK → users(id),   -- owner agenzia
  operator_user_id UUID FK → users(id),   -- operatore
  listing_scope    JSONB,                  -- null = tutti gli annunci; [UUID, ...] = scope ristretto
  added_at         TIMESTAMP,
  added_by_user_id UUID
)
```

### 6.3 Scope degli annunci

- `listingScope = null` → l'operatore ha accesso a **tutti** gli annunci dell'agenzia
- `listingScope = [uuid1, uuid2, ...]` → accesso solo a quegli annunci specifici

Modifica scope:
```
PATCH /api/agency/operators/{operatorUserId}/scope
{ listingScope: UUID[] | null }
```

### 6.4 Rimozione operatore

```
DELETE /api/agency/operators/{operatorUserId}
→ 204 No Content
```

---

## 7. Annunci dell'Agenzia

### 7.1 Pubblicazione

Gli annunci dell'agenzia usano la stessa API dei landlord, ma con un comportamento diverso sul matching:

| Campo | Valore | Effetto |
|---|---|---|
| `directContactOnTenantInterest` | `true` (impostato automaticamente) | Quando un tenant mette like, il match passa direttamente a `CONTACT_UNLOCKED` (nessuna fase di accettazione manuale) |

### 7.2 Scope operatore

Quando un `AGENCY_OPERATOR` crea o gestisce un annuncio, il sistema:
1. Risale all'`agencyUserId` tramite `AgencyService.resolvePublisherUserId()`
2. Verifica lo scope via `AgencyService.assertListingScope(listingId, operatorUserId)`

### 7.3 Disattivazione annuncio

L'owner e gli operatori con scope possono disattivare un annuncio `PUBLISHED` inserendo un motivo obbligatorio (campo `deactivation_reason`). L'annuncio passa allo stato `ARCHIVED`.

---

## 8. Rubrica (`/agency/rubrica`)

La rubrica mostra tutti i **profili tenant unici** che hanno messo like ad almeno un annuncio `PUBLISHED` dell'agenzia.

```
GET /api/agency/rubrica
→ List<TenantProfileCardDto>
```

Ogni scheda mostra:
- Codice profilo anonimizzato (o nome completo se `matchState = CONTACT_UNLOCKED`)
- Fascia età, categoria occupazione, numero occupanti, animali, fumatore
- Badge score: Sostenibilità affitto, Stabilità reddito, Affidabilità documenti (HIGH/MEDIUM/LOW)
- Data disponibilità, eventuale garante
- Contatti email/telefono solo se `CONTACT_UNLOCKED`

Per annuncio specifico:
```
GET /api/agency/rubrica/listings/{listingId}
→ List<TenantProfileCardDto>
```
Gli `AGENCY_OPERATOR` sono soggetti al controllo di scope.

---

## 9. Aree di Pertinenza — Schema Tecnico

### 9.1 Tabelle

```sql
-- Dati "leggibili" (lato UI)
agency_profiles.areas  JSONB   -- [{ type, name, osmId, osmType, displayName, boundingBox }]

-- Geometrie PostGIS (lato query)
agency_areas (
  id              UUID PK,
  agency_user_id  UUID FK → users(id),
  area_type       VARCHAR(20),   -- COMUNE | PROVINCIA | REGIONE
  osm_id          VARCHAR(50),
  name            VARCHAR(255),
  display_name    VARCHAR(255),
  area_geometry   geometry(Geometry, 4326),
  INDEX GIST(area_geometry)
)
```

### 9.2 Sincronizzazione

Ad ogni `updateAreas()` (admin):
1. `DELETE FROM agency_areas WHERE agency_user_id = ?`
2. Per ogni area con `boundingBox [south, north, west, east]`, inserisce un rettangolo JTS:
   ```
   POLYGON((west south, east south, east north, west north, west south))
   ```

### 9.3 Utilizzo futuro (matching)

```java
// AgencyAreaRepository
@Query("SELECT DISTINCT a.agency_user_id FROM agency_areas a
        WHERE ST_Intersects(a.area_geometry, ST_GeomFromText(:wkt, 4326))",
       nativeQuery = true)
List<UUID> findAgencyUserIdsByGeometryIntersection(@Param("wkt") String wkt);
```

Usabile per trovare le agenzie il cui territorio interseca la posizione di un annuncio o del domicilio di un tenant.

---

## 10. Endpoint di Riepilogo

### Agency (autenticato come `AGENCY` / `AGENCY_OPERATOR`)

| Metodo | Path | Accesso | Descrizione |
|---|---|---|---|
| `GET` | `/api/agency/profile` | AGENCY, AGENCY_OPERATOR | Legge il profilo agenzia |
| `PATCH` | `/api/agency/profile` | AGENCY (solo se ACTIVE) | Aggiorna dati profilo |
| `GET` | `/api/agency/operators` | AGENCY | Lista operatori |
| `POST` | `/api/agency/operators` | AGENCY (solo se ACTIVE) | Invita operatore |
| `PATCH` | `/api/agency/operators/{id}/scope` | AGENCY | Modifica scope annunci operatore |
| `DELETE` | `/api/agency/operators/{id}` | AGENCY | Rimuove operatore |
| `GET` | `/api/agency/rubrica` | AGENCY, AGENCY_OPERATOR | Profili interessati agli annunci |
| `GET` | `/api/agency/rubrica/listings/{id}` | AGENCY, AGENCY_OPERATOR | Profili per annuncio specifico |

### Admin (`SUPERADMIN`)

| Metodo | Path | Descrizione |
|---|---|---|
| `GET` | `/api/admin/agencies` | Lista agenzie (filtro per status, paginata) |
| `GET` | `/api/admin/agencies/{id}` | Dettaglio agenzia |
| `POST` | `/api/admin/agencies/{id}/approve` | Approva agenzia |
| `POST` | `/api/admin/agencies/{id}/reject` | Rifiuta con nota |
| `POST` | `/api/admin/agencies/{id}/suspend` | Sospende con nota |
| `PATCH` | `/api/admin/agencies/{id}/areas` | Assegna/modifica aree di pertinenza |

---

## 11. Vincoli e Regole di Business

- Un'agenzia **non può pubblicare annunci** finché il suo status è `PENDING_APPROVAL` o `SUSPENDED`.
- Un'agenzia **non può invitare operatori** finché non è `ACTIVE`.
- Le **aree di pertinenza** sono assegnate esclusivamente dall'admin (durante o dopo l'approvazione); l'agenzia le vede in sola lettura.
- Gli **score tenant** (HIGH/MEDIUM/LOW) non vengono mai esposti come numeri — solo come livelli categorici (GDPR + anti-discriminazione).
- Il matching per annunci di agenzie è **one-sided**: il tenant mette like e il contatto viene sbloccato automaticamente senza accettazione da parte dell'agenzia.
- Un operatore può appartenere a **una sola agenzia** alla volta.
- L'`agencyUserId` è sempre l'owner `AGENCY`; gli operatori referenziano l'agenzia tramite `agency_memberships`.
