CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    verification_status   VARCHAR(20)  NOT NULL DEFAULT 'NONE', -- NONE | PARTIAL | VERIFIED
    active                BOOLEAN      NOT NULL DEFAULT TRUE,
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
    type           VARCHAR(50) NOT NULL,  -- IDENTITY | PAYSLIP | EMPLOYMENT_CONTRACT | TAX_RETURN | BANK_STATEMENT | LANDLORD_REFERENCE | GUARANTOR_DOCUMENT
    file_url       TEXT        NOT NULL,
    uploaded_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    extracted_data JSONB       DEFAULT '{}'
);

CREATE INDEX idx_documents_user_id ON documents(user_id);

-- ─── Tenant interest areas ────────────────────────────────────────────────────

CREATE TABLE tenant_interest_areas (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    area_type    VARCHAR(50) NOT NULL,  -- POLYGON | CITY_BOUNDARY | ANYWHERE
    city_name    VARCHAR(255),
    area_geojson JSONB,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interest_areas_user_id ON tenant_interest_areas(user_id);

-- ─── PostGIS spatial column (optional — skipped gracefully if not available) ──

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;

    EXECUTE '
        ALTER TABLE tenant_interest_areas
            ADD COLUMN IF NOT EXISTS area_geometry geometry(Geometry, 4326)
                GENERATED ALWAYS AS (
                    CASE
                        WHEN area_geojson IS NOT NULL
                            THEN ST_GeomFromGeoJSON(area_geojson::text)
                        ELSE NULL
                    END
                ) STORED
    ';

    EXECUTE '
        CREATE INDEX IF NOT EXISTS idx_interest_areas_geometry
            ON tenant_interest_areas USING GIST (area_geometry)
    ';

    RAISE NOTICE 'PostGIS spatial index created on tenant_interest_areas.';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE
        'PostGIS not available — spatial column skipped. '
        'Install PostGIS and re-run migration V1 to enable server-side spatial queries. '
        'Error: %', SQLERRM;
END;
$$;
