ALTER TABLE onboarding_states
    ADD COLUMN IF NOT EXISTS completed_steps jsonb;
