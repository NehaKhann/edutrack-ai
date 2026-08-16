export interface Student {
  id: number;
  name: string;
  rollNumber: string;
  classSectionId: number;
}

export interface ClassSectionSummary {
  id: number;
  /** Full display label — "Grade 6" alone, or "Grade 6 — Violet" when this row is a section. */
  name: string;
  className: string;
  sectionName: string | null;
}

export interface TeacherSummary {
  id: number;
  name: string;
}

export interface ImportSkippedRow {
  row: number;
  reason: string;
}

export interface StudentImportResult {
  created: number;
  skipped: ImportSkippedRow[];
}
