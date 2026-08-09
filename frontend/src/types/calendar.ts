import type { DayOfWeek } from "./profile";

export interface Holiday {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface MonthView {
  year: number;
  month: number;
  weekendDays: DayOfWeek[];
  holidays: Holiday[];
}
