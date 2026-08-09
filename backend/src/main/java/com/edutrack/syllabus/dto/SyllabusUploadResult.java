package com.edutrack.syllabus.dto;

import java.util.List;

public record SyllabusUploadResult(
        SyllabusResponse syllabus,
        List<SyllabusDocumentResponse> documents,
        List<FailedFileResponse> failedFiles
) {
}
