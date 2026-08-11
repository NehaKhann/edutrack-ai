import { apiClient, unwrap } from "./client";
import type { ClassAttendanceSummary, StudentAttendanceRow, StudentAttendanceStatus } from "../types/attendance";

export function getAttendanceContext(params: {
  classSectionId: number;
  date: string;
  subjectId?: number;
  period?: number;
}): Promise<StudentAttendanceRow[]> {
  return unwrap(apiClient.get("/api/attendance", { params }));
}

export function bulkMarkAttendance(params: {
  classSectionId: number;
  date: string;
  subjectId?: number;
  period?: number;
  marks: { studentId: number; status: StudentAttendanceStatus }[];
}): Promise<void> {
  return unwrap(apiClient.post("/api/attendance/bulk", params));
}

export function getAttendanceSummary(date: string): Promise<ClassAttendanceSummary[]> {
  return unwrap(apiClient.get("/api/principal/attendance/summary", { params: { date } }));
}

export function getAttendanceDetail(classSectionId: number, date: string): Promise<StudentAttendanceRow[]> {
  return unwrap(apiClient.get("/api/principal/attendance/detail", { params: { classSectionId, date } }));
}
