CREATE TABLE login_attempt (
    attempt_key VARCHAR(255) PRIMARY KEY,
    failures INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
