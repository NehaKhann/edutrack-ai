import { apiClient, unwrap } from "./client";
import type { TeacherAccount, TeacherDirectoryEntry, TeacherProfile } from "../types/profile";

export function getMyProfile(): Promise<TeacherProfile> {
  return unwrap(apiClient.get("/api/teacher-profiles/me"));
}

export function updateMyProfile(payload: { designation: string; bio: string; phone: string }): Promise<TeacherProfile> {
  return unwrap(apiClient.put("/api/teacher-profiles/me", payload));
}

export function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  return unwrap(apiClient.put("/api/teacher-profiles/me/password", { currentPassword, newPassword }));
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

export function myCvPath(): string {
  return "/api/teacher-profiles/me/cv";
}

export function teacherCvPath(teacherId: number): string {
  return `/api/principal/teacher-profiles/${teacherId}/cv`;
}

export function getDirectory(): Promise<TeacherDirectoryEntry[]> {
  return unwrap(apiClient.get("/api/principal/teacher-profiles"));
}

export function getInactiveDirectory(): Promise<TeacherDirectoryEntry[]> {
  return unwrap(apiClient.get("/api/principal/teacher-profiles/inactive"));
}

export function getTeacherProfile(teacherId: number): Promise<TeacherProfile> {
  return unwrap(apiClient.get(`/api/principal/teacher-profiles/${teacherId}`));
}

export function deactivateTeacher(teacherId: number): Promise<void> {
  return unwrap(apiClient.post(`/api/principal/teacher-profiles/${teacherId}/deactivate`));
}

export function reactivateTeacher(teacherId: number): Promise<void> {
  return unwrap(apiClient.post(`/api/principal/teacher-profiles/${teacherId}/reactivate`));
}

export function listAccounts(): Promise<TeacherAccount[]> {
  return unwrap(apiClient.get("/api/principal/teacher-profiles/accounts"));
}

export function createAccount(payload: { name: string; email: string; phone: string; cv: File | null }): Promise<TeacherAccount> {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("email", payload.email);
  if (payload.phone) form.append("phone", payload.phone);
  if (payload.cv) form.append("cv", payload.cv);
  return unwrap(apiClient.post("/api/principal/teacher-profiles/accounts", form, { headers: { "Content-Type": "multipart/form-data" } }));
}
