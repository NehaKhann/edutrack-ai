import { apiClient, unwrap } from "./client";
import type { DayOfWeek } from "../types/profile";
import type { DayStatus, MonthView } from "../types/calendar";

export function getMonthView(year: number, month: number): Promise<MonthView> {
  return unwrap(apiClient.get("/api/calendar", { params: { year, month } }));
}

export function setDay(date: string, status: DayStatus, reason?: string): Promise<MonthView> {
  return unwrap(apiClient.post("/api/principal/calendar/day", { date, status, reason: reason || null }));
}

export function resetDay(date: string): Promise<MonthView> {
  return unwrap(apiClient.delete(`/api/principal/calendar/day/${date}`));
}

export function bulkUpdate(payload: {
  startDate: string;
  endDate: string;
  dayOfWeek?: DayOfWeek | null;
  status: DayStatus;
  reason?: string;
}): Promise<{ updatedCount: number }> {
  return unwrap(
    apiClient.post("/api/principal/calendar/bulk", {
      ...payload,
      dayOfWeek: payload.dayOfWeek || null,
      reason: payload.reason || null,
    })
  );
}

export function getWeekendDays(): Promise<DayOfWeek[]> {
  return unwrap(apiClient.get("/api/principal/calendar/weekend-days"));
}

export function setWeekendDays(weekendDays: DayOfWeek[]): Promise<DayOfWeek[]> {
  return unwrap(apiClient.put("/api/principal/calendar/weekend-days", { weekendDays }));
}
