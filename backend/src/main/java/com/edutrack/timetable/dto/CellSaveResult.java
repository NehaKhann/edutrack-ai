package com.edutrack.timetable.dto;

import java.util.List;

public record CellSaveResult(TimetableEntryResponse entry, List<TimetableClashWarning> clashes) {
}
