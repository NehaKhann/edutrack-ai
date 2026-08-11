import type { DayOfWeek } from "./profile";

export type DayStatus = "WORKING" | "OFF" | "EXAM" | "EVENT";

export interface DayOverride {
  date: string;
  status: DayStatus;
  reason: string | null;
  changedByName: string | null;
  changedAt: string | null;
}

export interface MonthView {
  year: number;
  month: number;
  weekendDays: DayOfWeek[];
  overrides: DayOverride[];
}

export interface DayStatusInfo {
  date: string;
  calendarStatus: DayStatus;
  calendarReason: string | null;
  weekend: boolean;
  onApprovedLeave: boolean;
  diarySubmitted: boolean;
  attendanceMarked: boolean;
  personalNote: string | null;
}
