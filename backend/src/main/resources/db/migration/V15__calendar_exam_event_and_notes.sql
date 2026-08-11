ALTER TABLE calendar_day_override DROP CONSTRAINT calendar_day_override_status_check;
ALTER TABLE calendar_day_override ADD CONSTRAINT calendar_day_override_status_check
    CHECK (status IN ('WORKING', 'OFF', 'EXAM', 'EVENT'));

CREATE TABLE teacher_day_note (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    note VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, date)
);

CREATE INDEX idx_teacher_day_note_teacher_date ON teacher_day_note(teacher_id, date);
