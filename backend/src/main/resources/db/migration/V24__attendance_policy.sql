ALTER TABLE school ADD COLUMN attendance_cutoff_time TIME NOT NULL DEFAULT '09:00:00';
ALTER TABLE school ADD COLUMN attendance_auto_absent_time TIME NOT NULL DEFAULT '11:00:00';

ALTER TABLE teacher_attendance_record DROP CONSTRAINT teacher_attendance_record_method_check;
ALTER TABLE teacher_attendance_record ADD CONSTRAINT teacher_attendance_record_method_check
    CHECK (method IN ('MANUAL', 'FACE_RECOGNITION', 'FINGERPRINT', 'AUTO', 'PRINCIPAL_OVERRIDE'));
