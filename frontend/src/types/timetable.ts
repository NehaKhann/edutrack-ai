export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
};

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export interface TimetableEntry {
  id: number;
  dayOfWeek: Weekday;
  period: number;
  subjectId: number | null;
  subjectName: string | null;
  teacherId: number | null;
  teacherName: string | null;
  classSectionId: number;
  classSectionName: string;
}

export interface ClassTimetable {
  classSectionId: number;
  classSectionName: string;
  entries: TimetableEntry[];
}

export interface TeacherTimetable {
  teacherId: number;
  teacherName: string;
  entries: TimetableEntry[];
}

export interface TimetableClash {
  classSectionId: number;
  classSectionName: string;
}

export interface CellSaveResult {
  entry: TimetableEntry | null;
  clashes: TimetableClash[];
}

export function cellKey(dayOfWeek: Weekday, period: number): string {
  return `${dayOfWeek}-${period}`;
}
