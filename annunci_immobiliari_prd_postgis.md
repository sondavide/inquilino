# PRD – Schema dati per pubblicazione annunci immobiliari (PostGIS-ready)

## 1. Scopo

Questo documento definisce in modo dettagliato tutte le proprietà, categorie, dipendenze e regole necessarie per implementare la funzionalità di **pubblicazione annunci immobiliari** in una piattaforma web responsive ispirata a portali come Immobiliare.it.

Il documento è pensato per essere usato da un **agente AI di coding** per sviluppare:

- modello dati
- wizard / form di inserimento annuncio
- validazioni frontend/backend
- logica condizionale tra campi
- struttura per query geospaziali con PostGIS

---

## 2. Obiettivi funzionali

La funzionalità deve permettere a un utente (privato, agenzia o altro soggetto autorizzato) di:

- creare un annuncio immobiliare
- salvarlo come bozza
- completarlo step-by-step
- pubblicarlo
- aggiornare dati e media
- specificare posizione geografica precisa o approssimata
- definire prezzo, caratteristiche, disponibilità e regole dell’immobile
- supportare filtri di ricerca avanzati
- supportare matching futuro con profili inquilino

---

## 3. Entità principali

### 3.1 Listing
Annuncio immobiliare pubblicato o in bozza.

### 3.2 PropertyUnit
Unità immobiliare oggetto dell’annuncio.

### 3.3 ListingLocation
Localizzazione geografica e amministrativa dell’immobile.

### 3.4 ListingPrice
Prezzo, costi accessori, deposito, spese.

### 3.5 ListingFeatures
Caratteristiche strutturali, dotazioni, stato, servizi.

### 3.6 ListingMedia
Foto, video, planimetrie, documenti.

### 3.7 ListingPublisher
Soggetto che pubblica l’annuncio.

### 3.8 ListingRules
Regole ammesse sull’uso dell’immobile e preferenze neutre/non discriminatorie.

---

## 4. Categorie principali dell’annuncio

Ogni annuncio deve appartenere a una combinazione coerente di categorie.

### 4.1 Transaction Type
Tipo transazione:
- `rent`
- `sale`

Per questa piattaforma la funzionalità minima richiesta è `rent`, ma il modello deve restare estendibile.

### 4.2 Listing Type
Tipo annuncio:
- `long_term_rent`
- `short_term_rent`
- `transitional_rent`
- `student_rent`
- `room_rent`

### 4.3 Property Type
Tipologia immobile:
- `apartment`
- `studio`
- `loft`
- `penthouse`
- `house`
- `villa`
- `room`
- `bed_in_shared_room`
- `office`
- `shop`
- `warehouse`
- `garage`
- `building`
- `other`

### 4.4 Publisher Type
Tipo inserzionista:
- `private`
- `agency`
- `builder`
- `property_manager`

---

## 5. Flusso consigliato di inserimento annuncio

1. Categoria annuncio
2. Ubicazione
3. Prezzo e costi
4. Caratteristiche principali
5. Caratteristiche avanzate e dotazioni
6. Disponibilità e regole
7. Efficienza energetica e compliance
8. Media
9. Dati inserzionista
10. Review e pubblicazione

---

## 6. Proprietà dettagliate per categoria

## 6.1 Categoria annuncio

```json
{
  "transaction_type": "rent",
  "listing_type": "long_term_rent | short_term_rent | transitional_rent | student_rent | room_rent",
  "property_type": "apartment | studio | loft | penthouse | house | villa | room | bed_in_shared_room | office | shop | warehouse | garage | building | other",
  "publisher_type": "private | agency | builder | property_manager"
}
```

### Regole
- `transaction_type` è obbligatorio
- `listing_type` è obbligatorio
- `property_type` è obbligatorio
- `publisher_type` è obbligatorio

### Dipendenze
- Se `property_type = room` o `bed_in_shared_room`, alcune proprietà cambiano:
  - il numero stanze dell’unità locata può non coincidere con quello dell’intero immobile
  - diventano rilevanti campi come `shared_kitchen`, `shared_bathroom`, `roommates_count`
- Se `listing_type = student_rent`, diventano rilevanti:
  - `students_only`
  - `contract_duration_months`
  - `utilities_included`
- Se `listing_type = short_term_rent`, diventano rilevanti:
  - `minimum_stay_days`
  - `maximum_stay_days`
  - `available_from`
  - `available_to`

---

## 6.2 Identificazione annuncio

```json
{
  "listing_id": "uuid",
  "status": "draft | in_review | published | suspended | archived",
  "title": "string",
  "description": "string",
  "internal_reference": "string",
  "slug": "string"
}
```

### Campi
- `title`: obbligatorio
- `description`: obbligatorio
- `internal_reference`: opzionale, utile per agenzie
- `slug`: generato dal sistema

### Regole
- titolo 15–120 caratteri
- descrizione 50–10000 caratteri
- no HTML non autorizzato
- descrizione deve essere sanitizzata lato backend

---

## 6.3 Ubicazione (PostGIS-ready)

```json
{
  "country_code": "IT",
  "region": "string",
  "province": "string",
  "municipality": "string",
  "district": "string",
  "postal_code": "string",
  "street_name": "string",
  "street_number": "string",
  "full_address": "string",
  "location_point": "geometry(Point, 4326)",
  "display_point": "geometry(Point, 4326)",
  "location_precision": "exact | approximate | hidden",
  "geocoding_provider": "string",
  "place_id": "string"
}
```

### Campi obbligatori minimi
- `country_code`
- `region`
- `province`
- `municipality`
- `location_point`
- `location_precision`

### Campi consigliati
- `district`
- `postal_code`
- `street_name`
- `street_number`
- `full_address`
- `display_point`
- `place_id`

### Regole PostGIS
- `location_point` deve essere un `POINT SRID 4326`
- `display_point` può coincidere con `location_point`
- se `location_precision = approximate`, `display_point` deve essere spostato/approssimato per proteggere la privacy
- il sistema deve supportare ricerca per:
  - bbox
  - raggio
  - distanza da punto
  - poligono/quartiere

### Dipendenze
- Se `location_precision = hidden`, in frontend non mostrare indirizzo completo
- Se `location_precision = approximate`, mostrare zona/quartiere ma non numero civico
- Se `property_type = garage`, il quartiere e l’accessibilità diventano particolarmente rilevanti

---

## 6.4 Prezzo e costi

```json
{
  "currency": "EUR",
  "monthly_rent": 0,
  "weekly_rent": 0,
  "daily_rent": 0,
  "sale_price": 0,
  "condominium_fees": 0,
  "utilities_included": false,
  "utilities_estimated_monthly": 0,
  "deposit_months": 0,
  "deposit_amount": 0,
  "agency_fee_amount": 0,
  "agency_fee_notes": "string",
  "other_costs_notes": "string",
  "price_visibility": "public | reserved"
}
```

### Campi obbligatori per affitto standard
- `currency`
- `monthly_rent`

### Campi condizionali
- `daily_rent` richiesto o rilevante se `listing_type = short_term_rent`
- `weekly_rent` opzionale se `listing_type = short_term_rent`
- `sale_price` usato solo se `transaction_type = sale`

### Dipendenze
- Se `transaction_type = rent`:
  - `monthly_rent` obbligatorio per `long_term_rent`, `transitional_rent`, `student_rent`, `room_rent`
- Se `listing_type = short_term_rent`:
  - almeno uno tra `daily_rent`, `weekly_rent`, `monthly_rent` deve essere presente
- Se `publisher_type = agency`:
  - `agency_fee_amount` o `agency_fee_notes` devono essere gestibili
- Se `deposit_amount` non è inserito ma `deposit_months` sì:
  - il sistema può derivare `deposit_amount = deposit_months * monthly_rent`

### Regole
- importi >= 0
- massimo due decimali
- valuta predefinita EUR ma estendibile

---

## 6.5 Caratteristiche principali dell’unità

```json
{
  "surface_sqm": 0,
  "commercial_surface_sqm": 0,
  "rooms_count": 0,
  "bedrooms_count": 0,
  "bathrooms_count": 0,
  "floor_number": 0,
  "total_building_floors": 0,
  "elevator": false,
  "parking_spaces_count": 0,
  "garage_included": false,
  "balconies_count": 0,
  "terraces_count": 0,
  "cellars_count": 0
}
```

### Campi obbligatori minimi per residenziale
- `surface_sqm`
- `rooms_count` oppure `bedrooms_count` in base al tipo immobile
- `bathrooms_count` se applicabile

### Dipendenze
- Se `property_type` è residenziale (`apartment`, `studio`, `loft`, `penthouse`, `house`, `villa`):
  - `surface_sqm` obbligatorio
  - `bathrooms_count` consigliato/obbligatorio
- Se `property_type = studio`:
  - `rooms_count` può essere 1
  - `bedrooms_count` può essere 0 o 1 in base al modello
- Se `property_type = room`:
  - `surface_sqm` riferito alla stanza
  - `bathrooms_count` riferito a immobile o uso esclusivo va distinto
- Se `floor_number > 0`:
  - `elevator` diventa rilevante
- Se `garage_included = true`:
  - `parking_spaces_count >= 1`

---

## 6.6 Caratteristiche specifiche per stanze e posti letto

```json
{
  "room_type": "single | double | shared_bed",
  "room_surface_sqm": 0,
  "room_furnished": true,
  "private_bathroom": false,
  "shared_bathroom": true,
  "shared_kitchen": true,
  "roommates_count": 0,
  "gender_preference_allowed": false,
  "students_only": false
}
```

### Regole
- Questo blocco si applica se `property_type = room` o `bed_in_shared_room`
- `room_type` obbligatorio in questi casi

### Dipendenze
- Se `property_type = room`:
  - `room_type` obbligatorio
  - `shared_kitchen` rilevante
  - `roommates_count` rilevante
- Se `listing_type = student_rent`:
  - `students_only` può essere usato
- `gender_preference_allowed` **non deve essere esposto come filtro libero** salvo casi legalmente supportati di condivisione abitativa; richiede analisi legale e policy dedicata

---

## 6.7 Stato immobile e disponibilità

```json
{
  "condition_status": "new | excellent | renovated | good | habitable | to_restore",
  "furnished_status": "furnished | partially_furnished | unfurnished",
  "kitchen_status": "equipped | partially_equipped | not_equipped",
  "heating_type": "centralized | autonomous | heat_pump | none | other",
  "cooling_type": "air_conditioning | central_cooling | none | other",
  "available_from": "date",
  "available_to": "date",
  "minimum_contract_duration_months": 0,
  "maximum_contract_duration_months": 0,
  "availability_status": "available_now | available_from_date | rented | reserved"
}
```

### Campi obbligatori
- `condition_status`
- `furnished_status`
- `availability_status`

### Dipendenze
- Se `availability_status = available_from_date`:
  - `available_from` obbligatorio
- Se `listing_type = short_term_rent`:
  - `available_from` raccomandato
  - `available_to` opzionale ma rilevante
  - `minimum_contract_duration_months` può essere sostituito da `minimum_stay_days`
- Se `listing_type = long_term_rent`:
  - `minimum_contract_duration_months` rilevante
- Se `furnished_status = furnished`:
  - il sistema può mostrare dotazioni interne come obbligatorie o fortemente consigliate

---

## 6.8 Dotazioni e comfort

```json
{
  "air_conditioning": false,
  "internet_available": false,
  "fiber_available": false,
  "tv": false,
  "washing_machine": false,
  "dishwasher": false,
  "dryer": false,
  "oven": false,
  "microwave": false,
  "refrigerator": false,
  "freezer": false,
  "security_door": false,
  "alarm_system": false,
  "concierge": false,
  "garden": false,
  "private_garden": false,
  "shared_garden": false,
  "pool": false,
  "gym": false,
  "wheelchair_accessible": false,
  "disabled_bathroom": false
}
```

### Dipendenze
- Se `garden = true`, almeno uno tra `private_garden` e `shared_garden` dovrebbe essere definito
- Se `wheelchair_accessible = true`, diventano rilevanti:
  - `elevator`
  - `floor_number`
  - `disabled_bathroom`
- Se `furnished_status = unfurnished`, dotazioni come elettrodomestici possono essere opzionali o non applicabili

---

## 6.9 Efficienza energetica e compliance

```json
{
  "energy_class": "A4 | A3 | A2 | A1 | B | C | D | E | F | G | n_a",
  "energy_index_epgl": 0,
  "energy_certificate_available": false,
  "energy_certificate_file_id": "uuid",
  "heating_energy_source": "gas | electric | district_heating | biomass | other",
  "renewable_energy_present": false
}
```

### Campi obbligatori
Per molti annunci immobiliari in Italia devono essere gestiti:
- `energy_class`
- `energy_index_epgl`

### Dipendenze
- Se `energy_certificate_available = true`:
  - `energy_certificate_file_id` opzionale ma consigliato
- Se `energy_class = n_a`:
  - richiede motivazione o stato particolare, da gestire con policy interna

### Regole
- valori energetici devono essere numerici e non negativi
- il frontend deve evidenziare che questi campi sono importanti per compliance

---

## 6.10 Regole immobile e preferenze neutre

```json
{
  "max_occupants": 0,
  "pets_allowed": true,
  "smoking_allowed": false,
  "children_allowed": true,
  "subletting_allowed": false,
  "residence_allowed": true,
  "students_allowed": true,
  "workers_allowed": true,
  "short_stay_allowed": false,
  "notes_for_tenants": "string"
}
```

### Regole
- questo blocco deve evitare campi discriminatori
- consentire solo regole legate all’immobile, al contratto o all’uso

### Dipendenze
- Se `listing_type = student_rent`, `students_allowed` è normalmente `true`
- Se `listing_type = short_term_rent`, `short_stay_allowed = true`
- Se `property_type = room`, `max_occupants` tipicamente 1 o 2

### Non consentire come campi standard
- nazionalità preferita
- etnia
- religione
- orientamento sessuale
- stato civile
- altre caratteristiche personali discriminatorie

---

## 6.11 Dati media

```json
{
  "cover_image_file_id": "uuid",
  "image_file_ids": ["uuid"],
  "video_file_ids": ["uuid"],
  "floorplan_file_ids": ["uuid"],
  "virtual_tour_url": "string"
}
```

### Regole
- almeno 1 immagine per pubblicazione
- consigliate almeno 5 immagini
- una `cover_image_file_id` deve essere selezionabile
- supportare riordino immagini

### Dipendenze
- Se `property_type` è residenziale:
  - foto interne fortemente consigliate
- Se `property_type = room`:
  - utile distinguere foto stanza vs foto spazi comuni

---

## 6.12 Dati inserzionista

```json
{
  "publisher_user_id": "uuid",
  "publisher_type": "private | agency | builder | property_manager",
  "display_name": "string",
  "agency_name": "string",
  "vat_number": "string",
  "rea_number": "string",
  "contact_mode": "platform_only | phone | email | mixed",
  "contact_phone": "string",
  "contact_email": "string",
  "website_url": "string"
}
```

### Campi obbligatori
- `publisher_user_id`
- `publisher_type`
- `display_name`
- `contact_mode`

### Dipendenze
- Se `publisher_type = agency`:
  - `agency_name` obbligatorio
  - `vat_number` consigliato/obbligatorio secondo compliance
  - `rea_number` consigliato
- Se `contact_mode = phone` o `mixed`:
  - `contact_phone` obbligatorio
- Se `contact_mode = email` o `mixed`:
  - `contact_email` obbligatorio

---

## 6.13 Metadati di pubblicazione

```json
{
  "publication_status": "draft | pending_review | published | rejected | archived",
  "published_at": "timestamp",
  "expires_at": "timestamp",
  "last_edited_at": "timestamp",
  "featured": false,
  "boost_level": "none | basic | premium"
}
```

### Dipendenze
- Se `publication_status = published`:
  - tutti i campi minimi obbligatori devono essere completi
  - almeno una immagine deve essere presente
- Se `boost_level != none`:
  - il sistema può richiedere pagamento o permessi specifici

---

## 7. Campi obbligatori minimi per pubblicare un annuncio in affitto

## 7.1 Obbligatori tecnici/prodotto
- `transaction_type`
- `listing_type`
- `property_type`
- `title`
- `description`
- `country_code`
- `region`
- `province`
- `municipality`
- `location_point`
- `location_precision`
- `currency`
- `monthly_rent` oppure prezzo coerente con il tipo annuncio
- `surface_sqm` se applicabile
- `condition_status`
- `furnished_status`
- `availability_status`
- almeno 1 immagine
- `publisher_user_id`
- `publisher_type`
- `display_name`
- `contact_mode`

## 7.2 Obbligatori di compliance da gestire
- `energy_class`
- `energy_index_epgl`

---

## 8. Proprietà dipendenti da altre proprietà (matrice sintetica)

| Proprietà trigger | Proprietà dipendente | Regola |
|---|---|---|
| `transaction_type = rent` | `monthly_rent` | obbligatorio per affitto standard |
| `listing_type = short_term_rent` | `daily_rent` / `weekly_rent` / `minimum_stay_days` | almeno un prezzo breve periodo e regole permanenza |
| `listing_type = student_rent` | `students_only`, `contract_duration` | campi rilevanti |
| `property_type = room` | `room_type`, `roommates_count`, `shared_kitchen` | diventano obbligatori o fortemente consigliati |
| `property_type = bed_in_shared_room` | `room_type = shared_bed` | coerente con modello |
| `availability_status = available_from_date` | `available_from` | obbligatorio |
| `publisher_type = agency` | `agency_name`, `vat_number` | richiesti/consigliati |
| `contact_mode = phone` | `contact_phone` | obbligatorio |
| `contact_mode = email` | `contact_email` | obbligatorio |
| `contact_mode = mixed` | `contact_phone`, `contact_email` | entrambi obbligatori |
| `garden = true` | `private_garden` / `shared_garden` | almeno uno valorizzato |
| `garage_included = true` | `parking_spaces_count` | >= 1 |
| `location_precision = approximate` | `display_point` | necessario punto approssimato |
| `energy_certificate_available = true` | `energy_certificate_file_id` | consigliato |
| `property_type` residenziale | `bathrooms_count`, `surface_sqm` | obbligatori o fortemente consigliati |
| `floor_number > 0` | `elevator` | rilevante |
| `wheelchair_accessible = true` | `disabled_bathroom`, `elevator` | rilevanti |

---

## 9. Proprietà opzionali ma utili per matching con inquilini

Questi campi non devono essere usati in modo discriminatorio, ma possono migliorare il matching funzionale.

```json
{
  "preferred_contract_types": ["standard", "transitional", "student"],
  "ideal_move_in_window_days": 30,
  "minimum_income_suggested": 0,
  "max_rent_to_income_ratio_suggested": 0.4,
  "requires_guarantor": false,
  "accepts_company_lease": false
}
```

### Regole
- questi campi sono **informativi o di matching**, non devono tradursi in esclusione automatica opaca
- se usati, devono essere spiegabili e neutrali

---

## 10. Struttura suggerita del wizard/form

### Step 1 – Categoria annuncio
- transaction type
- listing type
- property type
- publisher type

### Step 2 – Posizione
- paese
- regione
- provincia
- comune
- quartiere
- indirizzo
- geocoding
- location precision

### Step 3 – Prezzo
- canone/prezzo
- spese
- deposito
- fee agenzia

### Step 4 – Caratteristiche principali
- metratura
- locali
- bagni
- piano
- ascensore

### Step 5 – Stato e dotazioni
- stato immobile
- arredamento
- cucina
- riscaldamento
- clima
- accessibilità
- comfort

### Step 6 – Disponibilità e regole
- disponibile da
- durata minima
- animali
- fumatori
- occupanti max

### Step 7 – Efficienza energetica
- classe energetica
- EPgl
- APE disponibile

### Step 8 – Media
- foto
- planimetrie
- video

### Step 9 – Inserzionista e contatti
- contatti
- agenzia / privato
- dati fiscali se necessari

### Step 10 – Review e pubblicazione
- validazione finale
- errori
- salvataggio bozza o pubblicazione

---

## 11. Modello dati SQL/PostGIS suggerito (alto livello)

```sql
-- geometry columns use SRID 4326

listing (
  id uuid pk,
  publisher_user_id uuid not null,
  transaction_type text not null,
  listing_type text not null,
  property_type text not null,
  publisher_type text not null,
  status text not null,
  title text not null,
  description text not null,
  internal_reference text null,
  slug text not null unique,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  published_at timestamptz null
);

listing_location (
  listing_id uuid pk references listing(id),
  country_code text not null,
  region text not null,
  province text not null,
  municipality text not null,
  district text null,
  postal_code text null,
  street_name text null,
  street_number text null,
  full_address text null,
  location_precision text not null,
  location_point geometry(Point, 4326) not null,
  display_point geometry(Point, 4326) not null
);

listing_price (
  listing_id uuid pk references listing(id),
  currency text not null,
  monthly_rent numeric(12,2) null,
  weekly_rent numeric(12,2) null,
  daily_rent numeric(12,2) null,
  sale_price numeric(12,2) null,
  condominium_fees numeric(12,2) null,
  utilities_included boolean not null default false,
  utilities_estimated_monthly numeric(12,2) null,
  deposit_months integer null,
  deposit_amount numeric(12,2) null,
  agency_fee_amount numeric(12,2) null,
  agency_fee_notes text null
);
```

### Indici consigliati
- indice GIST su `listing_location.location_point`
- indice GIST su `listing_location.display_point`
- indici btree su:
  - `listing.transaction_type`
  - `listing.listing_type`
  - `listing.property_type`
  - `listing.status`
  - `listing_price.monthly_rent`
  - `listing_location.municipality`
  - `listing_location.district`

---

## 12. Validazioni backend obbligatorie

- coerenza tra categoria e campi richiesti
- coerenza tra prezzo e tipo annuncio
- validità SRID geometrie
- sanificazione testi
- validazione media
- blocco campi discriminatori non consentiti
- verifica completezza minima per pubblicazione

---

## 13. Considerazioni UX per frontend

- mobile-first
- salvataggio bozza automatico
- step dinamici
- campi condizionali mostrati solo quando servono
- mappa per selezione posizione
- autocomplete indirizzo
- preview annuncio in tempo reale
- controllo qualità foto
- warning se mancano campi legali/compliance

---

## 14. Output finale atteso

Alla fine del wizard il sistema deve produrre un payload coerente, pronto per salvataggio e pubblicazione.

```json
{
  "listing": {},
  "location": {},
  "price": {},
  "features": {},
  "media": {},
  "publisher": {},
  "rules": {},
  "compliance": {},
  "publication": {}
}
```

---

## 15. Obiettivo di implementazione

L’agente AI di coding deve usare questo documento per sviluppare:

- schema dati
- API CRUD annuncio
- validazioni
- wizard dinamico
- logica condizionale campi
- persistenza PostGIS per geolocalizzazione
- supporto ricerca e filtri futuri
