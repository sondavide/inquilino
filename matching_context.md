# Contesto Tecnico – Motore di Matching

Questo documento descrive il contesto completo del progetto per lo sviluppo del modulo di matching tra inquilini e annunci immobiliari. Va letto insieme a `matching_ux_privacy_prd.md`, `descrizione.md`, `requisiti.md` e `onboarding.md`.

---

## 1. Stato del progetto

### Già implementato
| Modulo | Stato |
|--------|-------|
| Auth (JWT + OAuth2) | ✅ Completo |
| Onboarding chatbot (18 step) | ✅ Completo |
| Profilo tenant + validazione supervisore | ✅ Completo |
| Aree di interesse tenant (PostGIS poligoni) | ✅ Completo |
| Annunci locatore (wizard 10 step) | ✅ Completo |
| Validazione annunci supervisore | ✅ Completo |
| Notifiche in-app + Web Push (VAPID) | ✅ Completo |
| Traduzioni annunci IT/EN | ✅ Completo |
| **Motore di matching** | ❌ Da implementare |
| **Vista inquilino – lista annunci** | ❌ Da implementare |
| **Vista locatore – lista profili** | ❌ Da implementare |
| **Flusso interesse / sblocco contatto** | ❌ Da implementare |
| **Chat interna (contact_unlocked)** | ❌ Da implementare (MVP semplificato) |

---

## 2. Stack tecnico

| Layer | Tecnologia |
|-------|------------|
| Backend | Spring Boot 3.4.4, Java 21 |
| ORM | Spring Data JPA + Hibernate |
| DB | PostgreSQL 17 + PostGIS |
| Storage | MinIO (S3-compatible) |
| AI | OpenAI GPT-4o-mini via Spring AI |
| Frontend | React 18, TypeScript 5.6, Vite 6 |
| Stile | Tailwind CSS 3.4, shadcn/ui |
| Mappe | Leaflet 1.9.4 + react-leaflet 4.2 |
| i18n | Gestito (IT/EN in base a preferenza utente) – **la UI è mobile-first** |
| Geocoding | Nominatim (OSM) – no Google Maps |

---

## 3. Modello dati rilevante per il matching

### 3.1 TenantProfile – campi rilevanti al matching
```java
// Preferenze cercate
BigDecimal maxBudget;          // Budget massimo mensile
LocalDate moveInDate;          // Data ingresso desiderata
Integer occupants;             // Numero occupanti
boolean hasPets;
boolean smoker;
// Lo status del profilo – solo VERIFIED partecipa al matching
VerificationStatus verificationStatus; // NONE|PARTIAL|PENDING_VALIDATION|IN_VALIDATION|NEEDS_CORRECTION|VERIFIED
boolean active;
```

Le **aree di interesse** sono in tabella separata `TenantInterestArea` (vedi §3.3).

Non è ancora presente un campo per `desiredPropertyType` (lista di `PropertyType` cercate). Va valutata l'aggiunta.

### 3.2 Listing – campi rilevanti al matching
```java
ListingStatus status;          // Solo PUBLISHED partecipa al matching
// Prezzo (in ListingPrice)
BigDecimal monthlyRent;
// Localizzazione (in ListingLocation)
Point locationPoint;           // geometry(Point,4326) – coordinate reali (mai esposte fino a contact_unlocked)
Point displayPoint;            // geometry(Point,4326) – coordinate oscurate (~150-300m jitter)
LocationPrecision locationPrecision; // EXACT|APPROXIMATE|HIDDEN
// Disponibilità (in ListingAvailability)
LocalDate availableFrom;
Integer maxOccupants;
boolean petsAllowed;
boolean smokingAllowed;
// Caratteristiche (in ListingFeatures)
PropertyType propertyType;     // APARTMENT|STUDIO|LOFT|PENTHOUSE|HOUSE|VILLA|ROOM|BED_IN_SHARED_ROOM|...
```

### 3.3 TenantInterestArea – geometrie PostGIS
```java
@Entity @Table(name = "tenant_interest_areas")
UUID id;
UUID userId;
String areaType;               // POLYGON|CITY_BOUNDARY|ANYWHERE
String cityName;
Map<String, Object> areaGeojson; // GeoJSON geometry (JSONB) – null per ANYWHERE
// Colonna generata automaticamente da trigger PostGIS:
// area_geometry geometry(Geometry,4326)  ← usata per ST_Contains / ST_DWithin
```

**Indice:** `idx_interest_areas_geometry` (GIST su `area_geometry`)

**Repository esistente:**
```java
@Query("SELECT DISTINCT a.userId FROM TenantInterestArea a WHERE a.areaType = 'ANYWHERE' OR ST_Contains(a.areaGeometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) = true")
List<UUID> findUserIdsContainingPoint(@Param("lat") double lat, @Param("lng") double lng);
```

### 3.4 LandlordProfile – contatti
```java
String contactMode;     // platform_only | phone | email | mixed
String contactPhone;
String contactEmail;
```
Lo sblocco del contatto espone `contactPhone` e/o `contactEmail` in base al `contactMode` scelto dal locatore.

---

## 4. Entità da creare: Match

### 4.1 Struttura `Match` (da implementare)
Basata sulla struttura JSON del PRD (`matching_ux_privacy_prd.md`, §13.1):

```
Match {
  id                      UUID PK
  listing_id              UUID FK → listings.id
  tenant_profile_id       UUID FK → tenant_profiles.id
  
  -- Hard filter results
  geo_match               BOOLEAN
  price_match             BOOLEAN
  timing_match            BOOLEAN
  property_type_match     BOOLEAN

  -- Distanze/delta calcolate
  geo_distance_meters     DOUBLE
  price_delta_percentage  DOUBLE
  price_band              ENUM (within_budget | within_tolerance | over_budget)

  -- Punteggi soft (0-100 ciascuno)
  geo_score               DOUBLE
  price_score             DOUBLE
  timing_score            DOUBLE
  fit_score               DOUBLE
  tenant_strength_score   DOUBLE

  -- Punteggi aggregati (due formule distinte)
  match_score_tenant      DOUBLE    -- peso: geo 35, price 30, timing 15, fit 20
  match_score_landlord    DOUBLE    -- peso: geo 20, price 20, timing 10, fit 20, strength 30

  -- Banda di compatibilità
  match_band              ENUM (excellent_match | good_match | medium_match | weak_match)
                          -- excellent>=85, good 70-84, medium 55-69, weak 40-54, sotto 40 non mostrare

  -- Stato macchina a stati
  match_state             ENUM (algorithmic | tenant_interested | landlord_interested | mutual_interest | contact_unlocked | archived)

  -- Timestamps azioni
  tenant_interest_at      TIMESTAMP
  landlord_interest_at    TIMESTAMP
  contact_unlocked_at     TIMESTAMP
  created_at              TIMESTAMP
  updated_at              TIMESTAMP
}
```

**Unique constraint:** `(listing_id, tenant_profile_id)`

**Indici consigliati:**
- `(listing_id, match_state)` – per query lato locatore
- `(tenant_profile_id, match_state)` – per query lato inquilino
- `(match_band, match_state)` – per filtri di qualità

### 4.2 Quando viene calcolato
Il calcolo è **event-driven**, non batch:
- Un `Listing` transita a `PUBLISHED` → calcolo match contro tutti i `TenantProfile` con `verificationStatus = VERIFIED AND active = true`
- Un `TenantProfile` transita a `VerificationStatus.VERIFIED` → calcolo match contro tutti i `Listing` con `status = PUBLISHED`

I match con `match_score < 40` vengono comunque salvati ma con `match_band = null` e non esposti nella UI normale.

---

## 5. Algoritmo di matching

### 5.1 Hard filters (esclusivi)
Un match esiste solo se **tutti** i seguenti sono `true`:

| Filter | Regola |
|--------|--------|
| `geo_match` | `listing.displayPoint` è contenuto in almeno un'area di interesse del tenant (ST_Contains) **oppure** la distanza dal punto più vicino è ≤ 5000m (ST_DWithin). Se `areaType = ANYWHERE` → sempre true. |
| `price_match` | `listing.monthlyRent <= tenant.maxBudget * 1.10` |
| `timing_match` | `\|listing.availableFrom - tenant.moveInDate\| <= 45 giorni` (se entrambi valorizzati) |
| `property_type_match` | Da implementare: richiede campo `desiredPropertyTypes` su TenantProfile |

### 5.2 Soft signals (ranking)
Tutti normalizzati 0–100:

| Score | Logica |
|-------|--------|
| `geo_score` | 100 se dentro il poligono, scala linearmente fino a 0 a 5 km |
| `price_score` | 100 se `rent <= budget_ideale`, scala fino a 0 al 110% del budget massimo |
| `timing_score` | 100 se disponibilità ≤ 7 gg dalla data desiderata, scala fino a 0 a 45 gg |
| `fit_score` | Media ponderata: arredato (20%), animali (20%), tipo immobile (20%), durata contratto (20%), max occupanti (20%) |
| `tenant_strength_score` | Basato su score categoriali da `ScoringService`: reddito verificato, documenti completi, garante, rapporto canone/reddito, identità verificata |

### 5.3 Formula aggregata
```
match_score_tenant   = geo*0.35 + price*0.30 + timing*0.15 + fit*0.20
match_score_landlord = geo*0.20 + price*0.20 + timing*0.10 + fit*0.20 + strength*0.30
```

---

## 6. Macchina a stati del match

```
algorithmic
    ↓ (inquilino clicca "sono interessato")
tenant_interested ──────────────────────────────────────┐
    ↓ (locatore clicca "segnala interesse" / "invita")  │
mutual_interest ←── landlord_interested ←── (locatore)  │
    ↓ (entrambe le parti accettano)                     │
contact_unlocked                                        │
    ↓                                                   │
archived ←────────────────────────────────────────────-─┘
         (qualsiasi parte archivia/rifiuta)
```

**Matching simmetrico:**
- L'inquilino sfoglia la lista degli annunci pubblicati (filtrati per compatibilità)
- Il locatore sfoglia la lista dei profili compatibili con il suo annuncio
- Entrambi possono esprimere interesse per primi
- Quando c'è **doppio interesse** (tenant_interested + landlord_interested → mutual_interest): notifica a entrambe le parti

### Notifica al doppio match
Usare `ProfileNotification` (già esistente) esteso con tipo `MATCH_MUTUAL` + Web Push se sottoscritto.

---

## 7. Privacy gating (regole di visibilità)

### Lato inquilino che guarda un annuncio
| Campo | algorithmic | mutual_interest | contact_unlocked |
|-------|-------------|-----------------|------------------|
| Foto | ✅ | ✅ | ✅ |
| Prezzo | ✅ | ✅ | ✅ |
| Via senza civico | ✅ | ✅ | ✅ |
| `displayPoint` (jitter ~150-300m) | ✅ | ✅ | ✅ |
| Indirizzo completo con civico | ❌ | ❌ | ✅ |
| `locationPoint` esatto | ❌ | ❌ | ✅ |
| Email/telefono locatore | ❌ | ❌ | ✅ (in base a `contactMode`) |
| Nome locatore | ❌ | ❌ | ✅ |

### Lato locatore che guarda un profilo tenant
| Campo | algorithmic | mutual_interest | contact_unlocked |
|-------|-------------|-----------------|------------------|
| ID profilo anonimo | ✅ | ✅ | ✅ |
| Fascia età, budget, aree aggregate | ✅ | ✅ | ✅ |
| Score categoriali (HIGH/MEDIUM/LOW) | ✅ | ✅ | ✅ |
| Descrizione sintetica anonima | ✅ | ✅ | ✅ |
| Nome e cognome | ❌ | ❌ | ✅ |
| Email / telefono | ❌ | ❌ | ✅ |
| Documenti originali | ❌ | ❌ | ✅ (se condivisi) |
| Codice fiscale / residenza | ❌ | ❌ | ❌ (mai esposti in automatico) |

---

## 8. Descrizioni sintetiche generate da AI

Il sistema deve generare testo breve neutro per card e dettaglio (max ~200 caratteri).

**Per annunci (lato inquilino):**
> "Bilocale arredato in zona servita, compatibile con il tuo budget"
> "Stanza singola vicino ai mezzi, disponibile da settembre"

**Per profili (lato locatore):**
> "Profilo singolo con budget coerente e documentazione verificata"
> "Coppia con garante e disponibilità da luglio"

Queste descrizioni sono pre-generate e salvate nel record Match (o nei profili/annunci) per evitare chiamate AI a ogni rendering.

Regole obbligatorie:
- Nessun dato identificativo
- Nessuna inferenza su etnia, religione, nazionalità
- Tono neutro e informativo
- Generato in **italiano e inglese** (i18n)

---

## 9. i18n e mobile-first

- La webapp è **mobile-first** (Tailwind breakpoints partono da mobile)
- L'utente sceglie la lingua all'accesso: `LanguageSelectPage` già esistente
- Le traduzioni degli **annunci** (title_en, description_en) sono già supportate nel DB e gestite da `ListingTranslationService`
- Le nuove chiavi di testo del matching (label badge, descrizioni sintetiche, stati match, CTA) devono essere aggiunte ai file i18n esistenti in `inquilino-frontend/src/i18n/` in entrambe le lingue

---

## 10. Struttura file backend da creare

```
com.inquilino/
├── entity/
│   └── Match.java                      (nuova entità)
├── enums/
│   ├── MatchState.java                 (algorithmic|tenant_interested|...)
│   └── MatchBand.java                  (excellent_match|good_match|...)
├── repository/
│   └── MatchRepository.java
├── service/
│   ├── MatchingService.java            (calcolo hard filter + soft score)
│   └── MatchStateService.java          (transizioni di stato, sblocco contatto)
├── controller/
│   ├── TenantMatchController.java      (GET /api/tenant/matches - lista annunci)
│   └── LandlordMatchController.java    (GET /api/landlord/listings/{id}/matches)
└── dto/
    ├── ListingCardDto.java             (vista anonimizzata per l'inquilino)
    ├── TenantProfileCardDto.java       (vista anonimizzata per il locatore)
    └── MatchInterestDto.java           (payload per esprimere interesse)
```

---

## 11. Struttura file frontend da creare

```
src/
├── pages/
│   ├── tenant/
│   │   ├── TenantMatchesPage.tsx       (lista annunci compatibili)
│   │   └── ListingDetailPage.tsx       (dettaglio annuncio con CTA)
│   └── landlord/
│       └── ListingMatchesPage.tsx      (lista profili per un annuncio)
├── components/
│   ├── matching/
│   │   ├── ListingCard.tsx             (card annuncio – privacy-aware)
│   │   ├── TenantProfileCard.tsx       (card profilo – anonimizzata)
│   │   ├── MatchBadge.tsx              (badge excellent/good/medium/weak)
│   │   ├── MatchStateCTA.tsx           (CTA dinamica in base a match_state)
│   │   └── ProgressiveDisclosureGate.tsx (wrapper che filtra campi per stato)
│   └── map/
│       └── ApproximateMarker.tsx       (marker con jitter su displayPoint)
└── api/
    └── matching.ts                     (chiamate API matching)
```

---

## 12. Endpoint API da creare

### Lato inquilino
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/tenant/matches` | Lista annunci compatibili (ordinati per match_score_tenant) |
| GET | `/api/tenant/matches/{matchId}` | Dettaglio annuncio per un match |
| POST | `/api/tenant/matches/{matchId}/interest` | Esprime interesse ("sono interessato") |
| POST | `/api/tenant/matches/{matchId}/dismiss` | "Non mi interessa" → archived |
| POST | `/api/tenant/matches/{matchId}/accept-invite` | Accetta invito del locatore |

### Lato locatore
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/landlord/listings/{listingId}/matches` | Lista profili per un annuncio |
| GET | `/api/landlord/listings/{listingId}/matches/{matchId}` | Dettaglio profilo per un match |
| POST | `/api/landlord/listings/{listingId}/matches/{matchId}/interest` | "Segnala interesse" |
| POST | `/api/landlord/listings/{listingId}/matches/{matchId}/invite` | "Invita al contatto" |
| POST | `/api/landlord/listings/{listingId}/matches/{matchId}/dismiss` | "Non interessante" |

---

## 13. Decisioni di design prese

| Decisione | Scelta |
|-----------|--------|
| Trigger calcolo match | Event-driven al publish di profilo o annuncio (non batch) |
| Profili esclusi | Solo `VERIFIED + active=true` partecipano al matching |
| Annunci esclusi | Solo `PUBLISHED` partecipano al matching |
| Geometrie aree di interesse | `POLYGON` o `MULTIPOLYGON` via PostGIS (già in tabella `tenant_interest_areas`) |
| Calcolo distanza | PostGIS: `ST_Contains` + `ST_DWithin` (indice GIST già esistente) |
| Coordinate esposte | Solo `displayPoint` (jitter) fino a `contact_unlocked`, poi `locationPoint` |
| Sblocco contatto | In `contact_unlocked`: inquilino vede tutto + contatti locatore; locatore vede nome/telefono/email inquilino |
| Contatti locatore esposti | Filtrati da `LandlordProfile.contactMode` (platform_only → nessuno, phone → solo tel, email → solo email, mixed → entrambi) |
| Matching simmetrico | Sì: sia inquilino che locatore possono esprimere interesse per primi |
| Doppio interesse | Genera notifica a entrambe le parti e transizione a `mutual_interest` |
| Chat interna | Fuori scope MVP – `contact_unlocked` sblocca solo dati di contatto |
| i18n | Obbligatorio IT+EN su tutti i nuovi testi UI |
| Mobile-first | Obbligatorio su tutte le nuove pagine e componenti |
