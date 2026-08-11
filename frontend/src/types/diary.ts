export type DiaryEntryStatus = "DRAFT" | "SUBMITTED";

export interface DiaryEntry {
  id: number;
  subjectId: number;
  subjectName: string;
  classSectionName: string;
  teacherId: number;
  teacherName: string;
  date: string;
  content: string;
  pageNumber: string | null;
  dueDate: string | null;
  hasAttachment: boolean;
  attachmentFilename: string | null;
  status: DiaryEntryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DiarySubjectRow {
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  entry: DiaryEntry | null;
}
