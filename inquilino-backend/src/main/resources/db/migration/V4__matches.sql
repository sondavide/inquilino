-- ─── Tabella matches ─────────────────────────────────────────────────────────
-- Ogni record rappresenta un potenziale abbinamento tra un annuncio (listing)
-- e il profilo di un inquilino (tenant_profile).
-- Viene creato/ricalcolato ogni volta che un listing viene PUBLISHED
-- o un TenantProfile transita a VERIFIED.

CREATE TABLE IF NOT EXISTS matches (
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

    -- Timestamps azioni
    tenant_interest_at      TIMESTAMP,
    landlord_interest_at    TIMESTAMP,
    contact_unlocked_at     TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_match_listing_tenant UNIQUE (listing_id, tenant_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_listing_id       ON matches(listing_id);
CREATE INDEX IF NOT EXISTS idx_matches_tenant_profile_id ON matches(tenant_profile_id);
CREATE INDEX IF NOT EXISTS idx_matches_listing_state    ON matches(listing_id, match_state);
CREATE INDEX IF NOT EXISTS idx_matches_tenant_state     ON matches(tenant_profile_id, match_state);
CREATE INDEX IF NOT EXISTS idx_matches_band_state       ON matches(match_band, match_state);
