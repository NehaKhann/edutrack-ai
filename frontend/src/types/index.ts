export type Role = "TEACHER" | "PRINCIPAL" | "ADMIN";

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: Role;
  schoolId: number;
}

export interface Subject {
  id: number;
  name: string;
  classSectionId: number;
  classSectionName: string;
  teacherId: number;
  teacherName: string;
}

export interface SyllabusDto {
  id: number;
  term: string;
  termStartDate: string;
  subjectId: number;
  subjectName: string;
  confirmed: boolean;
  confirmedAt: string | null;
  hasExtractedTopics: boolean;
}

export interface SyllabusDocument {
  id: number;
  syllabusId: number;
  originalFilename: string;
  extractedText: string;
  orderIndex: number;
}

export interface FailedFile {
  filename: string;
  reason: string;
}

export interface SyllabusUploadResult {
  syllabus: SyllabusDto;
  documents: SyllabusDocument[];
  failedFiles: FailedFile[];
}

export interface Topic {
  id: number;
  syllabusId: number;
  title: string;
  startWeek: number | null;
  endWeek: number | null;
  plannedStartDate: string;
  plannedEndDate: string;
  orderIndex: number;
  covered: boolean;
  coveredDate: string | null;
}

export type LessonPlanStatus = "PLANNED" | "COVERED" | "MISSED" | "RESCHEDULED";

export interface LessonPlanEntry {
  id: number;
  topicId: number;
  topicTitle: string;
  subjectId: number;
  subjectName: string;
  plannedDate: string;
  status: LessonPlanStatus;
  reason: string | null;
  actualDate: string | null;
}

export type CoverageStatus = "ON_TRACK" | "AHEAD" | "BEHIND" | "NOT_STARTED";

export interface CoverageGridRow {
  classSectionId: number;
  classSectionName: string;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  plannedToDateCount: number;
  coveredCount: number;
  status: CoverageStatus;
}

export interface SubjectCoverageDetail {
  subjectId: number;
  subjectName: string;
  topics: Topic[];
  missedOrRescheduledEntries: LessonPlanEntry[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}
