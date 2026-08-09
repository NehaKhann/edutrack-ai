CREATE TABLE school_weekend_day (
    school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY')),
    PRIMARY KEY (school_id, day_of_week)
);

CREATE TABLE school_holiday (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_school_holiday_school ON school_holiday(school_id);
CREATE INDEX idx_school_holiday_range ON school_holiday(school_id, start_date, end_date);
