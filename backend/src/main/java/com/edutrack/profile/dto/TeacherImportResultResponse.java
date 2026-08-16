package com.edutrack.profile.dto;

import com.edutrack.common.ImportSkippedRow;

import java.util.List;

public record TeacherImportResultResponse(List<CreatedTeacher> created, List<ImportSkippedRow> skipped) {
    public record CreatedTeacher(String name, String email, String tempPassword) {
    }
}
