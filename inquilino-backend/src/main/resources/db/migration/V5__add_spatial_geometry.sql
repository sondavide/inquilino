-- Attempt to enable PostGIS and add a spatial geometry column.
-- If PostGIS is not installed on this PostgreSQL instance the block catches
-- the error and emits a NOTICE instead of failing — the app still starts and
-- uses the Java/JTS fallback for point-in-polygon checks.
--
-- To activate PostGIS on Windows:
--   1. Open "Stack Builder" (installed alongside PostgreSQL)
--   2. Select your PostgreSQL server → Spatial Extensions → PostGIS
--   3. After installation run this migration again:
--        DELETE FROM flyway_schema_history WHERE version = '5';
--      then restart the app.
--
-- On Linux/Docker: use the `postgis/postgis` image or install the
-- postgresql-<ver>-postgis-3 package, then repeat the step above.

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;

    -- Generated column: auto-computed from area_geojson, physically stored.
    -- ANYWHERE areas (area_geojson IS NULL) produce NULL geometry and are
    -- handled with an explicit area_type = 'ANYWHERE' clause in queries.
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

    -- GIST index for O(log n) point-in-polygon lookups
    EXECUTE '
        CREATE INDEX IF NOT EXISTS idx_interest_areas_geometry
            ON tenant_interest_areas USING GIST (area_geometry)
    ';

    RAISE NOTICE 'PostGIS spatial index created on tenant_interest_areas.';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE
        'PostGIS not available — spatial column skipped. '
        'Install PostGIS and re-run migration V5 to enable server-side spatial queries. '
        'Error: %', SQLERRM;
END;
$$;
