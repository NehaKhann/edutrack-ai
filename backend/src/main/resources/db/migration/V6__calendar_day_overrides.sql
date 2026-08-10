DROP TABLE IF EXISTS school_holiday;

CREATE TABLE calendar_day_override (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('WORKING', 'OFF')),
    reason VARCHAR(500),
    changed_by BIGINT REFERENCES app_user(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, date)
);

CREATE INDEX idx_calendar_day_override_school_date ON calendar_day_override(school_id, date);
