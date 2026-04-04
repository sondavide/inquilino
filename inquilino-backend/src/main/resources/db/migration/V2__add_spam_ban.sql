-- Spam protection: track strike count and temporary/permanent ban per user
ALTER TABLE users
    ADD COLUMN spam_strikes      INTEGER   NOT NULL DEFAULT 0,
    ADD COLUMN chat_banned_until TIMESTAMP NULL;
