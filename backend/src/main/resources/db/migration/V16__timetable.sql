CREATE TABLE timetable_entry (
    id BIGSERIAL PRIMARY KEY,
    class_section_id BIGINT NOT NULL REFERENCES class_section(id) ON DELETE CASCADE,
    day_of_week VARCHAR(9) NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY')),
    period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),
    subject_id BIGINT REFERENCES subject(id) ON DELETE SET NULL,
    teacher_id BIGINT REFERENCES app_user(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_timetable_entry_slot UNIQUE (class_section_id, day_of_week, period)
);

CREATE INDEX idx_timetable_entry_class ON timetable_entry(class_section_id);
CREATE INDEX idx_timetable_entry_teacher ON timetable_entry(teacher_id, day_of_week, period);
