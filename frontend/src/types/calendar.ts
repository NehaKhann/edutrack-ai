import type { DayOfWeek } from "./profile";

export type DayStatus = "WORKING" | "OFF";

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
