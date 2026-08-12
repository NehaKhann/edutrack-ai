ALTER TABLE app_user ADD COLUMN temp_password VARCHAR(255);

ALTER TABLE teacher_profile ADD COLUMN phone VARCHAR(30);
ALTER TABLE teacher_profile ADD COLUMN cv_file_ref VARCHAR(255);
ALTER TABLE teacher_profile ADD COLUMN cv_filename VARCHAR(255);

CREATE TABLE notification (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_recipient ON notification(recipient_id, created_at DESC);
