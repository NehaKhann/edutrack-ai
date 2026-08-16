CREATE TABLE attendance_correction_request (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id),
    attendance_date DATE NOT NULL,
    requested_status VARCHAR(12) CHECK (requested_status IN ('PRESENT','ABSENT','ON_LEAVE','LATE','HALF_DAY')),
    reason TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    reviewed_by BIGINT REFERENCES app_user(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_correction_teacher ON attendance_correction_request(teacher_id);
