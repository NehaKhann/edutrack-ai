CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school(id),
    actor_id BIGINT REFERENCES app_user(id),
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id BIGINT,
    target_label VARCHAR(255),
    detail TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_school_created ON audit_log(school_id, created_at DESC);
