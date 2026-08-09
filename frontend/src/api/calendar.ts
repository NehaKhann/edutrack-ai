import { apiClient, unwrap } from "./client";
import type { DayOfWeek } from "../types/profile";
import type { Holiday, MonthView } from "../types/calendar";

export function getMonthView(year: number, month: number): Promise<MonthView> {
  return unwrap(apiClient.get("/api/calendar", { params: { year, month } }));
}

export function listHolidays(): Promise<Holiday[]> {
  return unwrap(apiClient.get("/api/principal/calendar/holidays"));
}

export function addHoliday(payload: { name: string; startDate: string; endDate: string }): Promise<Holiday> {
  return unwrap(apiClient.post("/api/principal/calendar/holidays", payload));
}

export function deleteHoliday(holidayId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/principal/calendar/holidays/${holidayId}`));
}

export function getWeekendDays(): Promise<DayOfWeek[]> {
  return unwrap(apiClient.get("/api/principal/calendar/weekend-days"));
}

export function setWeekendDays(weekendDays: DayOfWeek[]): Promise<DayOfWeek[]> {
  return unwrap(apiClient.put("/api/principal/calendar/weekend-days", { weekendDays }));
}
