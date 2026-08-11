CREATE TABLE student_attendance_record (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    class_section_id BIGINT NOT NULL REFERENCES class_section(id) ON DELETE CASCADE,
    subject_id BIGINT REFERENCES subject(id),
    period INTEGER,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PRESENT','ABSENT','LATE','LEAVE')),
    marked_by BIGINT NOT NULL REFERENCES app_user(id),
    marked_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_sar_class_date ON student_attendance_record(class_section_id, attendance_date);
CREATE INDEX idx_sar_student_date ON student_attendance_record(student_id, attendance_date);
