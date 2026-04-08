-- Add AI-generated match summary to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_summary TEXT;
