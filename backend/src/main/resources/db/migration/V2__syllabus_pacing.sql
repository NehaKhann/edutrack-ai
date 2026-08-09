CREATE TABLE syllabus (
    id BIGSERIAL PRIMARY KEY,
    subject_id BIGINT NOT NULL REFERENCES subject(id) ON DELETE CASCADE,
    term VARCHAR(100) NOT NULL,
    term_start_date DATE NOT NULL,
    uploaded_file_ref VARCHAR(500),
    raw_extracted_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_subject ON syllabus(subject_id);

CREATE TABLE topic (
    id BIGSERIAL PRIMARY KEY,
    syllabus_id BIGINT NOT NULL REFERENCES syllabus(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_week INT,
    end_week INT,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    covered BOOLEAN NOT NULL DEFAULT FALSE,
    covered_date DATE
);

CREATE INDEX idx_topic_syllabus ON topic(syllabus_id);

CREATE TABLE lesson_plan_entry (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PLANNED', 'COVERED', 'MISSED', 'RESCHEDULED')),
    reason VARCHAR(500),
    actual_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_plan_topic ON lesson_plan_entry(topic_id);
CREATE INDEX idx_lesson_plan_teacher_date ON lesson_plan_entry(teacher_id, planned_date);
