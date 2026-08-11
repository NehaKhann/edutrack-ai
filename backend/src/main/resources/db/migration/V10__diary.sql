CREATE TABLE diary_entry (
    id BIGSERIAL PRIMARY KEY,
    subject_id BIGINT NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id),
    entry_date DATE NOT NULL,
    content TEXT NOT NULL,
    page_number VARCHAR(50),
    due_date DATE,
    attachment_file_ref VARCHAR(500),
    attachment_filename VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (subject_id, entry_date)
);

CREATE INDEX idx_diary_entry_subject_date ON diary_entry(subject_id, entry_date);
