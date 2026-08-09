import type { Subject } from "./index";

export const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface TimetableSlot {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId: number | null;
  subjectName: string | null;
}

export interface TeacherProfile {
  teacherId: number;
  name: string;
  email: string;
  designation: string | null;
  bio: string | null;
  hasPhoto: boolean;
  subjects: Subject[];
  timetable: TimetableSlot[];
}

export interface TeacherDirectoryEntry {
  teacherId: number;
  name: string;
  email: string;
  designation: string | null;
  hasPhoto: boolean;
  subjectCount: number;
}
