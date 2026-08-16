import { apiClient, unwrap } from "./client";
import type { Subject } from "../types";
import type { CellSaveResult, ClassTimetable, TeacherTimetable, Weekday } from "../types/timetable";

export function getMyTimetable(): Promise<TeacherTimetable> {
  return unwrap(apiClient.get("/api/timetable/me"));
}

export function getClassTimetable(classSectionId: number): Promise<ClassTimetable> {
  return unwrap(apiClient.get(`/api/principal/timetable/class-sections/${classSectionId}`));
}

export function getClassSubjects(classSectionId: number): Promise<Subject[]> {
  return unwrap(apiClient.get(`/api/principal/timetable/class-sections/${classSectionId}/subjects`));
}

export function getTeacherTimetable(teacherId: number): Promise<TeacherTimetable> {
  return unwrap(apiClient.get(`/api/principal/timetable/teachers/${teacherId}`));
}

export function getTeacherSubjects(teacherId: number): Promise<Subject[]> {
  return unwrap(apiClient.get(`/api/principal/timetable/teachers/${teacherId}/subjects`));
}

export function saveCell(
  classSectionId: number,
  payload: { dayOfWeek: Weekday; period: number; subjectId: number | null }
): Promise<CellSaveResult> {
  return unwrap(apiClient.put(`/api/principal/timetable/class-sections/${classSectionId}/cells`, payload));
}

export function exportClassTimetableXlsx(classSectionId: number): Promise<Blob> {
  return apiClient.get(`/api/principal/timetable/class-sections/${classSectionId}/export`, { responseType: "blob" }).then((res) => res.data);
}

export function exportTeacherTimetableXlsx(teacherId: number): Promise<Blob> {
  return apiClient.get(`/api/principal/timetable/teachers/${teacherId}/export`, { responseType: "blob" }).then((res) => res.data);
}
