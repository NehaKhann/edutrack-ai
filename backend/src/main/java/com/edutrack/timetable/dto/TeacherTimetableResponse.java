package com.edutrack.timetable.dto;

import java.util.List;

public record TeacherTimetableResponse(Long teacherId, String teacherName, List<TimetableEntryResponse> entries) {
}
