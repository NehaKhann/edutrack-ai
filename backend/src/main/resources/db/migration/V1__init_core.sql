CREATE TABLE school (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('TEACHER', 'PRINCIPAL', 'ADMIN')),
    school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_user_school ON app_user(school_id);

CREATE TABLE class_section (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE
);

CREATE INDEX idx_class_section_school ON class_section(school_id);

CREATE TABLE subject (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_section_id BIGINT NOT NULL REFERENCES class_section(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT
);

CREATE INDEX idx_subject_class_section ON subject(class_section_id);
CREATE INDEX idx_subject_teacher ON subject(teacher_id);
