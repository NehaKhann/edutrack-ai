ALTER TABLE syllabus_document
    ALTER COLUMN file_ref DROP NOT NULL,
    ADD COLUMN content_type VARCHAR(150),
    ADD COLUMN ocr_confidence DOUBLE PRECISION,
    ADD COLUMN ocr_language VARCHAR(20),
    ADD COLUMN low_confidence_words TEXT;
