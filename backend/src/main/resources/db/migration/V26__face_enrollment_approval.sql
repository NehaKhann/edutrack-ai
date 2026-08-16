ALTER TABLE teacher_face_embedding ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE teacher_face_embedding ADD COLUMN photo_ref VARCHAR(500);
ALTER TABLE teacher_face_embedding ADD COLUMN reviewed_by BIGINT REFERENCES app_user(id);
ALTER TABLE teacher_face_embedding ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE teacher_face_embedding ADD COLUMN rejection_reason TEXT;
