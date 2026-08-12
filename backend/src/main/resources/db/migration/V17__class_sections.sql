ALTER TABLE class_section RENAME COLUMN name TO class_name;
ALTER TABLE class_section ADD COLUMN section_name VARCHAR(255);
