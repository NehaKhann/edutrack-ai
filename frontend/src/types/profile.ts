import type { Subject } from "./index";

export const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface TeacherProfile {
  teacherId: number;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  bio: string | null;
  hasPhoto: boolean;
  hasCv: boolean;
  cvFilename: string | null;
  mustChangePassword: boolean;
  subjects: Subject[];
}

export interface TeacherDirectoryEntry {
  teacherId: number;
  name: string;
  email: string;
  designation: string | null;
  hasPhoto: boolean;
  subjectCount: number;
}

export interface TeacherAccount {
  teacherId: number;
  name: string;
  email: string;
  phone: string | null;
  tempPassword: string | null;
  passwordChanged: boolean;
  hasCv: boolean;
  cvFilename: string | null;
}
