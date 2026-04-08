-- Add translated content columns to listings
ALTER TABLE listings
    ADD COLUMN title_en       VARCHAR(255),
    ADD COLUMN description_en TEXT,
    ADD COLUMN source_lang    VARCHAR(10) DEFAULT 'it';
