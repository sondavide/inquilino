CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Scoring templates ────────────────────────────────────────────────────────
-- Named templates that override the default equal-weight (20/20/20/20/20)
-- formula used in MatchingService.calcTenantStrength().
-- Live-link: profiles reference the template by FK; when a template is updated
-- a background job recalculates all linked VERIFIED profiles.

CREATE TABLE scoring_templates (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    weight_identity  INT NOT NULL DEFAULT 20 CHECK (weight_identity  >= 0),
    weight_income    INT NOT NULL DEFAULT 20 CHECK (weight_income    >= 0),
    weight_stability INT NOT NULL DEFAULT 20 CHECK (weight_stability >= 0),
    weight_documents INT NOT NULL DEFAULT 20 CHECK (weight_documents >= 0),
    weight_guarantor INT NOT NULL DEFAULT 20 CHECK (weight_guarantor >= 0),
    is_default       BOOLEAN NOT NULL DEFAULT false,
    created_by       UUID,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    type             VARCHAR(20)  NOT NULL,          -- TENANT | LANDLORD | SUPERVISOR | AGENCY | SUPERADMIN
    email            VARCHAR(255) UNIQUE NOT NULL,
    phone            VARCHAR(50),
    password_hash    VARCHAR(255),                   -- null for OAuth2-only users
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    -- OAuth2 social identity
    provider         VARCHAR(50),
    provider_user_id VARCHAR(255),
    profile_url      TEXT,
    -- Spam protection
    spam_strikes      INTEGER      NOT NULL DEFAULT 0,
    chat_banned_until TIMESTAMP    NULL
);

CREATE UNIQUE INDEX idx_users_provider ON users (provider, provider_user_id)
    WHERE provider IS NOT NULL;

-- ─── Tenant profiles ──────────────────────────────────────────────────────────

CREATE TABLE tenant_profiles (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name             VARCHAR(255),
    birth_date            DATE,
    birth_place           VARCHAR(255),
    residence             VARCHAR(255),
    fiscal_code           VARCHAR(16),
    employment_type       VARCHAR(50),               -- EMPLOYEE | SELF_EMPLOYED | STUDENT | RETIRED | OTHER
    monthly_income        NUMERIC(10, 2),
    contract_type         VARCHAR(50),
    employment_start_date DATE,
    has_guarantor         BOOLEAN      NOT NULL DEFAULT FALSE,
    guarantor_income      NUMERIC(10, 2),
    max_budget            NUMERIC(10, 2),
    move_in_date          DATE,
    occupants             INTEGER,
    has_pets              BOOLEAN      NOT NULL DEFAULT FALSE,
    smoker                BOOLEAN      NOT NULL DEFAULT FALSE,
    desired_locations     JSONB        DEFAULT '[]',
    profile_completion    INTEGER      NOT NULL DEFAULT 0,
    verification_status              VARCHAR(30)  NOT NULL DEFAULT 'NONE',
    -- NONE | PARTIAL | PENDING_VALIDATION | IN_VALIDATION | NEEDS_CORRECTION | VERIFIED
    active                           BOOLEAN      NOT NULL DEFAULT TRUE,
    assigned_supervisor_id           UUID         NULL,
    last_validated_by_supervisor_id  UUID         NULL,
    scoring_template_id              UUID         NULL REFERENCES scoring_templates(id) ON DELETE SET NULL,
    UNIQUE (user_id)
);

-- ─── Onboarding state ─────────────────────────────────────────────────────────

CREATE TABLE onboarding_states (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step    VARCHAR(50) NOT NULL DEFAULT 'STEP_0',
    step_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED
    collected_data  JSONB       DEFAULT '{}',
    completed_steps JSONB,
    missing_fields  JSONB       DEFAULT '[]',
    pending_actions JSONB       DEFAULT '[]',
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ─── Chat messages ────────────────────────────────────────────────────────────

CREATE TABLE chat_messages (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL,  -- USER | ASSISTANT
    content    TEXT        NOT NULL,
    step       VARCHAR(50),
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- ─── Documents ────────────────────────────────────────────────────────────────

CREATE TABLE documents (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type           VARCHAR(50) NOT NULL,  -- IDENTITY | PAYSLIP | EMPLOYMENT_CONTRACT | TAX_RETURN | BANK_STATEMENT | LANDLORD_REFERENCE | GUARANTOR_DOCUMENT | OTHER
    file_url       TEXT        NOT NULL,
    uploaded_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    extracted_data JSONB       DEFAULT '{}'
);

CREATE INDEX idx_documents_user_id ON documents(user_id);

-- ─── Tenant interest areas ────────────────────────────────────────────────────

CREATE TABLE tenant_interest_areas (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL,
    area_type      VARCHAR(50) NOT NULL,  -- POLYGON | CITY_BOUNDARY | ANYWHERE
    city_name      VARCHAR(255),
    area_geojson   JSONB,
    area_geometry  geometry(Geometry, 4326)
                       GENERATED ALWAYS AS (
                           CASE WHEN area_geojson IS NOT NULL
                               THEN ST_GeomFromGeoJSON(area_geojson::text)
                               ELSE NULL END
                       ) STORED,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interest_areas_user_id  ON tenant_interest_areas(user_id);
CREATE INDEX idx_interest_areas_geometry ON tenant_interest_areas USING GIST (area_geometry);

-- ─── Field validations ────────────────────────────────────────────────────────

CREATE TABLE field_validations (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_profile_id   UUID         NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    field_name          VARCHAR(100) NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | FLAGGED
    note                TEXT,
    supervisor_id       UUID,
    validated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    corrected_at        TIMESTAMP,
    UNIQUE (tenant_profile_id, field_name)
);

CREATE INDEX idx_field_validations_profile ON field_validations(tenant_profile_id);
CREATE INDEX idx_field_validations_status  ON field_validations(tenant_profile_id, status);

-- ─── Profile audit log ────────────────────────────────────────────────────────

CREATE TABLE profile_audit_logs (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_profile_id UUID        NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    actor_id          UUID        NOT NULL,
    actor_type        VARCHAR(20) NOT NULL,
    action            VARCHAR(50) NOT NULL,
    field_name        VARCHAR(100),
    old_value         TEXT,
    new_value         TEXT,
    note              TEXT,
    created_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_profile ON profile_audit_logs(tenant_profile_id);
CREATE INDEX idx_audit_logs_created ON profile_audit_logs(created_at DESC);

-- ─── In-app notifications ─────────────────────────────────────────────────────

CREATE TABLE profile_notifications (
    id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50)  NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON profile_notifications(user_id, read);

-- ─── Web Push subscriptions ───────────────────────────────────────────────────

CREATE TABLE push_subscriptions (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT  NOT NULL,
    p256dh     TEXT  NOT NULL,
    auth       TEXT  NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, endpoint)
);

-- ─── Landlord profiles ────────────────────────────────────────────────────────

CREATE TABLE landlord_profiles (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name        VARCHAR(255),
    -- Agency-specific (null for private landlords)
    agency_name         VARCHAR(255),
    vat_number          VARCHAR(50),
    rea_number          VARCHAR(50),
    website_url         TEXT,
    -- Contact preferences
    contact_mode        VARCHAR(30)  NOT NULL DEFAULT 'platform_only', -- platform_only | phone | email | mixed
    contact_phone       VARCHAR(50),
    contact_email       VARCHAR(255),
    -- Profile completion
    profile_completion  INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ─── Listings (main table) ────────────────────────────────────────────────────

CREATE TABLE listings (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Categories
    listing_type        VARCHAR(50)  NOT NULL,  -- LONG_TERM_RENT | SHORT_TERM_RENT | TRANSITIONAL_RENT | STUDENT_RENT | ROOM_RENT
    property_type       VARCHAR(50)  NOT NULL,  -- APARTMENT | STUDIO | LOFT | PENTHOUSE | HOUSE | VILLA | ROOM | BED_IN_SHARED_ROOM | ...
    publisher_type      VARCHAR(50)  NOT NULL,  -- PRIVATE | AGENCY | BUILDER | PROPERTY_MANAGER
    -- Identity
    status              VARCHAR(30)  NOT NULL DEFAULT 'DRAFT', -- DRAFT | IN_REVIEW | PUBLISHED | REJECTED | ARCHIVED | SUSPENDED
    title               VARCHAR(255),
    title_en            VARCHAR(255),
    description         TEXT,
    description_en      TEXT,
    source_lang         VARCHAR(10)  DEFAULT 'it',
    internal_reference  VARCHAR(100),
    slug                VARCHAR(255) UNIQUE,
    -- Metadata
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMP    NULL,
    -- Supervisor validation
    assigned_supervisor_id          UUID NULL,
    last_validated_by_supervisor_id UUID NULL
);

CREATE INDEX idx_listings_publisher   ON listings(publisher_user_id);
CREATE INDEX idx_listings_status      ON listings(status);
CREATE INDEX idx_listings_type        ON listings(listing_type);
CREATE INDEX idx_listings_prop_type   ON listings(property_type);

-- ─── Listing location (PostGIS) ───────────────────────────────────────────────

CREATE TABLE listing_locations (
    listing_id          UUID         PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    country_code        VARCHAR(10)  NOT NULL DEFAULT 'IT',
    region              VARCHAR(255),
    province            VARCHAR(255),
    municipality        VARCHAR(255),
    district            VARCHAR(255),
    postal_code         VARCHAR(20),
    street_name         VARCHAR(255),
    street_number       VARCHAR(20),
    full_address        TEXT,
    location_precision  VARCHAR(20)  NOT NULL DEFAULT 'EXACT', -- EXACT | APPROXIMATE | HIDDEN
    location_point      geometry(Point, 4326),
    display_point       geometry(Point, 4326),
    geocoding_provider  VARCHAR(100),
    place_id            VARCHAR(255)
);

CREATE INDEX idx_listing_locations_point   ON listing_locations USING GIST (location_point);
CREATE INDEX idx_listing_locations_display ON listing_locations USING GIST (display_point);
CREATE INDEX idx_listing_locations_muni    ON listing_locations(municipality);

-- ─── Listing price ────────────────────────────────────────────────────────────

CREATE TABLE listing_prices (
    listing_id                  UUID         PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    currency                    VARCHAR(10)  NOT NULL DEFAULT 'EUR',
    monthly_rent                NUMERIC(12,2),
    weekly_rent                 NUMERIC(12,2),
    daily_rent                  NUMERIC(12,2),
    condominium_fees            NUMERIC(12,2),
    utilities_included          BOOLEAN      NOT NULL DEFAULT FALSE,
    utilities_estimated_monthly NUMERIC(12,2),
    deposit_months              INTEGER,
    deposit_amount              NUMERIC(12,2),
    agency_fee_amount           NUMERIC(12,2),
    agency_fee_notes            TEXT,
    other_costs_notes           TEXT,
    price_visibility            VARCHAR(20)  NOT NULL DEFAULT 'public'  -- public | reserved
);

-- ─── Listing features (structural) ───────────────────────────────────────────

CREATE TABLE listing_features (
    listing_id              UUID    PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    surface_sqm             NUMERIC(8,2),
    commercial_surface_sqm  NUMERIC(8,2),
    rooms_count             INTEGER,
    bedrooms_count          INTEGER,
    bathrooms_count         INTEGER,
    floor_number            INTEGER,
    total_building_floors   INTEGER,
    elevator                BOOLEAN NOT NULL DEFAULT FALSE,
    parking_spaces_count    INTEGER NOT NULL DEFAULT 0,
    garage_included         BOOLEAN NOT NULL DEFAULT FALSE,
    balconies_count         INTEGER NOT NULL DEFAULT 0,
    terraces_count          INTEGER NOT NULL DEFAULT 0,
    cellars_count           INTEGER NOT NULL DEFAULT 0,
    -- Room-specific (used when property_type = ROOM or BED_IN_SHARED_ROOM)
    room_type               VARCHAR(30),  -- single | double | shared_bed
    room_surface_sqm        NUMERIC(8,2),
    room_furnished          BOOLEAN,
    private_bathroom        BOOLEAN,
    shared_bathroom         BOOLEAN,
    shared_kitchen          BOOLEAN,
    roommates_count         INTEGER,
    students_only           BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── Listing amenities (JSONB – many boolean flags) ───────────────────────────

CREATE TABLE listing_amenities (
    listing_id  UUID  PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    amenities   JSONB NOT NULL DEFAULT '{}'
);

-- ─── Listing availability & rules ────────────────────────────────────────────

CREATE TABLE listing_availability (
    listing_id                      UUID        PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    condition_status                VARCHAR(30),   -- new | excellent | renovated | good | habitable | to_restore
    furnished_status                VARCHAR(30),   -- furnished | partially_furnished | unfurnished
    kitchen_status                  VARCHAR(30),   -- equipped | partially_equipped | not_equipped
    heating_type                    VARCHAR(30),   -- centralized | autonomous | heat_pump | none | other
    cooling_type                    VARCHAR(30),   -- air_conditioning | central_cooling | none | other
    availability_status             VARCHAR(30),   -- available_now | available_from_date | rented | reserved
    available_from                  DATE,
    available_to                    DATE,
    minimum_contract_duration_months INTEGER,
    maximum_contract_duration_months INTEGER,
    minimum_stay_days               INTEGER,
    maximum_stay_days               INTEGER,
    -- Rules
    max_occupants                   INTEGER,
    pets_allowed                    BOOLEAN NOT NULL DEFAULT FALSE,
    smoking_allowed                 BOOLEAN NOT NULL DEFAULT FALSE,
    children_allowed                BOOLEAN NOT NULL DEFAULT TRUE,
    subletting_allowed              BOOLEAN NOT NULL DEFAULT FALSE,
    residence_allowed               BOOLEAN NOT NULL DEFAULT TRUE,
    students_allowed                BOOLEAN NOT NULL DEFAULT TRUE,
    workers_allowed                 BOOLEAN NOT NULL DEFAULT TRUE,
    short_stay_allowed              BOOLEAN NOT NULL DEFAULT FALSE,
    notes_for_tenants               TEXT
);

-- ─── Listing energy ───────────────────────────────────────────────────────────

CREATE TABLE listing_energy (
    listing_id                      UUID        PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
    energy_class                    VARCHAR(10),   -- A4|A3|A2|A1|B|C|D|E|F|G|NA
    energy_index_epgl               NUMERIC(8,2),
    energy_certificate_available    BOOLEAN NOT NULL DEFAULT FALSE,
    energy_certificate_file_url     TEXT,
    heating_energy_source           VARCHAR(30),   -- gas | electric | district_heating | biomass | other
    renewable_energy_present        BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── Listing media ────────────────────────────────────────────────────────────

CREATE TABLE listing_media (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    media_type  VARCHAR(20) NOT NULL DEFAULT 'IMAGE',  -- IMAGE | VIDEO | FLOORPLAN
    file_url    TEXT        NOT NULL,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    is_cover    BOOLEAN     NOT NULL DEFAULT FALSE,
    uploaded_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_media_listing ON listing_media(listing_id);

-- ─── Listing field validations ────────────────────────────────────────────────

CREATE TABLE listing_field_validations (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id   UUID         NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    field_name   VARCHAR(100) NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | FLAGGED
    note         TEXT,
    supervisor_id UUID,
    validated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    corrected_at  TIMESTAMP,
    UNIQUE (listing_id, field_name)
);

CREATE INDEX idx_listing_fv_listing ON listing_field_validations(listing_id);
CREATE INDEX idx_listing_fv_status  ON listing_field_validations(listing_id, status);

-- ─── Listing audit logs ───────────────────────────────────────────────────────

CREATE TABLE listing_audit_logs (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id  UUID        NULL REFERENCES listings(id) ON DELETE CASCADE,
    actor_id    UUID        NOT NULL,
    actor_type  VARCHAR(20) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    field_name  VARCHAR(100),
    old_value   TEXT,
    new_value   TEXT,
    note        TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_audit_listing ON listing_audit_logs(listing_id);
CREATE INDEX idx_listing_audit_created ON listing_audit_logs(created_at DESC);

-- ─── Matches ──────────────────────────────────────────────────────────────────

CREATE TABLE matches (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id              UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    tenant_profile_id       UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,

    -- Hard filter results
    geo_match               BOOLEAN NOT NULL DEFAULT FALSE,
    price_match             BOOLEAN NOT NULL DEFAULT FALSE,
    timing_match            BOOLEAN NOT NULL DEFAULT FALSE,
    property_type_match     BOOLEAN NOT NULL DEFAULT FALSE,

    -- Valori calcolati
    geo_distance_meters     DOUBLE PRECISION,
    price_delta_percentage  DOUBLE PRECISION,
    price_band              VARCHAR(30),    -- within_budget | within_tolerance | over_budget

    -- Punteggi soft (0-100 ciascuno)
    geo_score               DOUBLE PRECISION,
    price_score             DOUBLE PRECISION,
    timing_score            DOUBLE PRECISION,
    fit_score               DOUBLE PRECISION,
    tenant_strength_score   DOUBLE PRECISION,

    -- Punteggi aggregati (due formule distinte per le due viste)
    match_score_tenant      DOUBLE PRECISION,
    match_score_landlord    DOUBLE PRECISION,

    -- Banda di compatibilità
    match_band              VARCHAR(30),    -- excellent_match | good_match | medium_match | weak_match

    -- Macchina a stati
    match_state             VARCHAR(30) NOT NULL DEFAULT 'ALGORITHMIC',

    -- AI summary (ex V2: tenant_match_summary, match_summary_en, tenant_match_summary_en)
    match_summary           TEXT,
    tenant_match_summary    TEXT,
    match_summary_en        TEXT,
    tenant_match_summary_en TEXT,

    -- Timestamps azioni
    tenant_interest_at      TIMESTAMP,
    landlord_interest_at    TIMESTAMP,
    contact_unlocked_at     TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_match_listing_tenant UNIQUE (listing_id, tenant_profile_id)
);

CREATE INDEX idx_matches_listing_id        ON matches(listing_id);
CREATE INDEX idx_matches_tenant_profile_id ON matches(tenant_profile_id);
CREATE INDEX idx_matches_listing_state     ON matches(listing_id, match_state);
CREATE INDEX idx_matches_tenant_state      ON matches(tenant_profile_id, match_state);
CREATE INDEX idx_matches_band_state        ON matches(match_band, match_state);

-- ─── Score overrides ──────────────────────────────────────────────────────────

CREATE TABLE score_overrides (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_profile_id    UUID NOT NULL UNIQUE REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    supervisor_id        UUID NOT NULL,
    rent_sustainability  VARCHAR(10),   -- HIGH | MEDIUM | LOW | NULL (null = use algorithm)
    income_stability     VARCHAR(10),
    document_reliability VARCHAR(10),
    reason               TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Onboarding step configs (prompt overrides editabili dal superadmin) ──────
-- Se esiste una riga per step_id, i suoi prompt sostituiscono i default Java.
-- Variabili template supportate: {{collected_data}}, {{lang}}
-- Le modifiche sono attive entro ~30 secondi senza restart.

CREATE TABLE onboarding_step_configs (
    step_id                    VARCHAR(20)  PRIMARY KEY,
    system_prompt_override     TEXT,           -- sostituisce buildSystemPrompt() se valorizzato
    extraction_prompt_override TEXT,           -- sostituisce buildExtractionPrompt() se valorizzato
    admin_notes                TEXT,           -- note interne, non inviate al LLM
    updated_at                 TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_by                 VARCHAR(255)
);

COMMENT ON TABLE onboarding_step_configs IS
    'Runtime-editable LLM prompt overrides per onboarding step. '
    'Changes take effect within 30 seconds without restart.';

-- ─── Seed: scoring templates ──────────────────────────────────────────────────

INSERT INTO scoring_templates
    (name, description, weight_identity, weight_income, weight_stability, weight_documents, weight_guarantor, is_default)
VALUES
(
    'Standard',
    'Pesi bilanciati per il profilo inquilino generico. Tutti i fattori hanno uguale importanza. Usato come default quando nessun template è assegnato al profilo.',
    20, 20, 20, 20, 20, true
),
(
    'Pensionato d''oro',
    'Per pensionati con reddito elevato e stabile. L''algoritmo standard penalizza i pensionati sulla stabilità (RETIRED → MEDIUM), ma un reddito da pensione è in realtà continuativo e affidabile. Si dà più peso al reddito documentato e ai documenti finanziari; meno peso alla stabilità contrattuale e al garante.',
    12, 30, 10, 33, 15, false
),
(
    'Studente con garante',
    'Per studenti con garante d''eccellenza. Il garante compensa completamente la mancanza di reddito personale e la scarsa stabilità lavorativa. Reddito e stabilità propri quasi irrilevanti; il peso si sposta quasi interamente sul garante.',
    15, 5, 5, 20, 55, false
),
(
    'Dipendente a tempo indeterminato',
    'Per lavoratori dipendenti con contratto stabile. Massimizza il vantaggio della stabilità EMPLOYEE → HIGH dell''algoritmo. Il reddito documentato è importante; il garante è quasi superfluo quando il contratto è a tempo indeterminato.',
    15, 25, 35, 20, 5, false
),
(
    'Freelancer consolidato',
    'Per professionisti autonomi con attività avviata da almeno 2 anni. L''algoritmo classifica SELF_EMPLOYED come MEDIUM sulla stabilità, ma se il reddito è documentato e abbondante vale più della forma contrattuale. Peso alto su reddito verificato e documenti fiscali.',
    15, 35, 10, 35, 5, false
),
(
    'Lavoratore autonomo alle prime armi',
    'Per freelancer o partite IVA aperte di recente (meno di 12 mesi). Stabilità contrattuale bassa per definizione. Il garante diventa importante; la documentazione bancaria compensa l''assenza di storico reddituale consolidato.',
    15, 20, 5, 30, 30, false
);
