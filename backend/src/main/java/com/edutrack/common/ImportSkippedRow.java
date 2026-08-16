package com.edutrack.common;

/** One row an import couldn't process, with a human-readable reason — shared shape across student/teacher bulk import. */
public record ImportSkippedRow(int row, String reason) {
}
