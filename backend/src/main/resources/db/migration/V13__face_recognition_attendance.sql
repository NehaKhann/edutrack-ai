CREATE TABLE teacher_face_embedding (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,
    embedding TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE teacher_attendance_record
    ADD COLUMN method VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (method IN ('MANUAL', 'FACE_RECOGNITION'));

-- Allow a teacher to withdraw a leave request that hasn't been reviewed yet.
ALTER TABLE leave_request DROP CONSTRAINT leave_request_status_check;
ALTER TABLE leave_request ADD CONSTRAINT leave_request_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
