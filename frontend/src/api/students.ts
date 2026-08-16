import { apiClient, unwrap } from "./client";
import type { Student, StudentImportResult } from "../types/roster";

export function listStudents(classSectionId: number): Promise<Student[]> {
  return unwrap(apiClient.get(`/api/class-sections/${classSectionId}/students`));
}

export function createStudent(classSectionId: number, name: string, rollNumber: string): Promise<Student> {
  return unwrap(apiClient.post(`/api/class-sections/${classSectionId}/students`, { name, rollNumber }));
}

export function updateStudent(studentId: number, name: string, rollNumber: string): Promise<Student> {
  return unwrap(apiClient.put(`/api/students/${studentId}`, { name, rollNumber }));
}

export function deactivateStudent(studentId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/students/${studentId}`));
}

export function downloadStudentImportTemplate(): Promise<Blob> {
  return apiClient.get("/api/principal/students/import/template", { responseType: "blob" }).then((res) => res.data);
}

export function importStudents(file: File): Promise<StudentImportResult> {
  const form = new FormData();
  form.append("file", file);
  return unwrap(apiClient.post("/api/principal/students/import", form, { headers: { "Content-Type": "multipart/form-data" } }));
}
