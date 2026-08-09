import { apiClient, unwrap } from "./client";
import type { DayOfWeek, TeacherDirectoryEntry, TeacherProfile, TimetableSlot } from "../types/profile";

export function getMyProfile(): Promise<TeacherProfile> {
  return unwrap(apiClient.get("/api/teacher-profiles/me"));
}

export function updateMyProfile(payload: { designation: string; bio: string }): Promise<TeacherProfile> {
  return unwrap(apiClient.put("/api/teacher-profiles/me", payload));
}

export function uploadMyPhoto(file: File, onProgress?: (pct: number) => void): Promise<TeacherProfile> {
  const form = new FormData();
  form.append("file", file);
  return unwrap(
    apiClient.post("/api/teacher-profiles/me/photo", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    })
  );
}

export function myPhotoPath(): string {
  return "/api/teacher-profiles/me/photo";
}

export function teacherPhotoPath(teacherId: number): string {
  return `/api/principal/teacher-profiles/${teacherId}/photo`;
}

export function addTimetableSlot(payload: {
  subjectId: number | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}): Promise<TimetableSlot> {
  return unwrap(apiClient.post("/api/teacher-profiles/me/timetable", payload));
}

export function deleteTimetableSlot(slotId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/teacher-profiles/me/timetable/${slotId}`));
}

export function getDirectory(): Promise<TeacherDirectoryEntry[]> {
  return unwrap(apiClient.get("/api/principal/teacher-profiles"));
}

export function getTeacherProfile(teacherId: number): Promise<TeacherProfile> {
  return unwrap(apiClient.get(`/api/principal/teacher-profiles/${teacherId}`));
}
