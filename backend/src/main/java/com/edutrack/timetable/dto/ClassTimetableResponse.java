package com.edutrack.timetable.dto;

import java.util.List;

public record ClassTimetableResponse(Long classSectionId, String classSectionName, List<TimetableEntryResponse> entries) {
}
