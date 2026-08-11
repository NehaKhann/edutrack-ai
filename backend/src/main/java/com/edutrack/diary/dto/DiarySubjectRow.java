package com.edutrack.diary.dto;

public record DiarySubjectRow(
        Long subjectId,
        String subjectName,
        Long teacherId,
        String teacherName,
        DiaryEntryResponse entry
) {
}
