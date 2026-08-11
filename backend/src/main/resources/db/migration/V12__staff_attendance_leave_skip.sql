CREATE TABLE teacher_attendance_record (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id),
    attendance_date DATE NOT NULL,
    status VARCHAR(12) NOT NULL CHECK (status IN ('PRESENT','ABSENT','ON_LEAVE','LATE','HALF_DAY')),
    marked_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, attendance_date)
);

CREATE TABLE leave_request (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id),
    leave_type VARCHAR(12) NOT NULL CHECK (leave_type IN ('SICK','CASUAL','EMERGENCY','OTHER')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    document_file_ref VARCHAR(500),
    document_filename VARCHAR(255),
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    reviewed_by BIGINT REFERENCES app_user(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (to_date >= from_date)
);

CREATE INDEX idx_leave_request_teacher ON leave_request(teacher_id);
CREATE INDEX idx_leave_request_range ON leave_request(teacher_id, from_date, to_date);

CREATE TABLE skipped_class_report (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id),
    subject_id BIGINT NOT NULL REFERENCES subject(id),
    report_date DATE NOT NULL,
    period INTEGER,
    reason TEXT NOT NULL,
    substitute_teacher_id BIGINT REFERENCES app_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_skip_teacher_date ON skipped_class_report(teacher_id, report_date);
