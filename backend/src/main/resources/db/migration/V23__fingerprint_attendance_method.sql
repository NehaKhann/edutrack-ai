ALTER TABLE teacher_attendance_record DROP CONSTRAINT teacher_attendance_record_method_check;
ALTER TABLE teacher_attendance_record ADD CONSTRAINT teacher_attendance_record_method_check
    CHECK (method IN ('MANUAL', 'FACE_RECOGNITION', 'FINGERPRINT'));
