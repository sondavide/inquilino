CREATE TABLE tenant_interest_areas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    area_type    VARCHAR(50) NOT NULL,  -- POLYGON | CITY_BOUNDARY | ANYWHERE
    city_name    VARCHAR(255),
    area_geojson JSONB,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interest_areas_user_id ON tenant_interest_areas(user_id);
