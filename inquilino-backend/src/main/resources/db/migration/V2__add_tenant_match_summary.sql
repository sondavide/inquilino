ALTER TABLE matches ADD COLUMN IF NOT EXISTS tenant_match_summary    TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_summary_en        TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tenant_match_summary_en TEXT;
