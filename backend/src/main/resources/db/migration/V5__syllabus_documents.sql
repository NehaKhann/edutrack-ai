ALTER TABLE syllabus
    DROP COLUMN uploaded_file_ref,
    DROP COLUMN raw_extracted_text,
    ADD COLUMN confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN confirmed_at TIMESTAMPTZ;

CREATE TABLE syllabus_document (
    id BIGSERIAL PRIMARY KEY,
    syllabus_id BIGINT NOT NULL REFERENCES syllabus(id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    file_ref VARCHAR(500) NOT NULL,
    extracted_text TEXT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_document_syllabus ON syllabus_document(syllabus_id);
