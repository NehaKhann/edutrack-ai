package com.edutrack.org.dto;

import com.edutrack.common.ImportSkippedRow;

import java.util.List;

public record StudentImportResultResponse(int created, List<ImportSkippedRow> skipped) {
}
