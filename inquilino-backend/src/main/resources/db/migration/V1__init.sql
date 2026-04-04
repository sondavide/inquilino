CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (both tenants and landlords)
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type          VARCHAR(20)  NOT NULL,          -- TENANT | LANDLORD
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(50),
    password_hash VARCHAR(255),                   -- null for OAuth2-only users
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    -- OAuth2 social identity
    provider         VARCHAR(50),                 -- google | facebook | linkedin
    provider_user_id VARCHAR(255),
    profile_url      TEXT
);

CREATE UNIQUE INDEX idx_users_provider ON users (provider, provider_user_id)
    WHERE provider IS NOT NULL;

-- Tenant profiles (one per tenant user)
CREATE TABLE tenant_profiles (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name            VARCHAR(255),
    birth_date           DATE,
    birth_place          VARCHAR(255),
    residence            VARCHAR(255),
    fiscal_code          VARCHAR(16),
    employment_type      VARCHAR(50),             -- EMPLOYEE | SELF_EMPLOYED | STUDENT | RETIRED | OTHER
    monthly_income       NUMERIC(10, 2),
    contract_type        VARCHAR(50),
    employment_start_date DATE,
    has_guarantor        BOOLEAN DEFAULT FALSE,
    guarantor_income     NUMERIC(10, 2),
    max_budget           NUMERIC(10, 2),
    move_in_date         DATE,
    occupants            INTEGER,
    has_pets             BOOLEAN DEFAULT FALSE,
    smoker               BOOLEAN DEFAULT FALSE,
    desired_locations    JSONB DEFAULT '[]',      -- array of {city, area, coordinates}
    profile_completion   INTEGER NOT NULL DEFAULT 0,
    verification_status  VARCHAR(20) NOT NULL DEFAULT 'NONE',  -- NONE | PARTIAL | VERIFIED
    UNIQUE (user_id)
);

-- Onboarding conversation state (one per tenant user)
CREATE TABLE onboarding_states (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step    VARCHAR(50) NOT NULL DEFAULT 'STEP_0',
    step_status     VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',  -- NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED
    collected_data  JSONB DEFAULT '{}',   -- all data collected so far
    missing_fields  JSONB DEFAULT '[]',   -- string array
    pending_actions JSONB DEFAULT '[]',   -- string array
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- Chat messages (onboarding conversation history)
CREATE TABLE chat_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL,   -- USER | ASSISTANT
    content    TEXT        NOT NULL,
    step       VARCHAR(50),
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- Documents
CREATE TABLE documents (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type           VARCHAR(50) NOT NULL,  -- IDENTITY | PAYSLIP | EMPLOYMENT_CONTRACT | TAX_RETURN | BANK_STATEMENT | LANDLORD_REFERENCE | GUARANTOR_DOCUMENT
    file_url       TEXT        NOT NULL,
    uploaded_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    extracted_data JSONB DEFAULT '{}'    -- OCR / LLM-extracted structured fields
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
