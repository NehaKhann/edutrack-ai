CREATE TABLE chat_conversation (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    school_id BIGINT NOT NULL REFERENCES school(id),
    created_by BIGINT NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE chat_participant (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    joined_at TIMESTAMP NOT NULL DEFAULT now(),
    last_read_at TIMESTAMP,
    UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_chat_participant_user ON chat_participant(user_id);

CREATE TABLE chat_message (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES app_user(id),
    type VARCHAR(20) NOT NULL,
    content TEXT,
    file_ref VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(120),
    duration_seconds INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_chat_message_conversation_created ON chat_message(conversation_id, created_at);
