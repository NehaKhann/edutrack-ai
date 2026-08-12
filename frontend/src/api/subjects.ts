import { apiClient, unwrap } from "./client";
import type { Subject } from "../types";

export function getMySubjects(): Promise<Subject[]> {
  return unwrap(apiClient.get("/api/subjects"));
}

export function listSubjects(classSectionId?: number): Promise<Subject[]> {
  return unwrap(apiClient.get("/api/principal/subjects", { params: classSectionId ? { classSectionId } : undefined }));
}

export function createSubject(classSectionId: number, name: string, teacherId: number): Promise<Subject> {
  return unwrap(apiClient.post("/api/principal/subjects", { classSectionId, name, teacherId }));
}

export function updateSubject(subjectId: number, name: string, teacherId: number): Promise<Subject> {
  return unwrap(apiClient.put(`/api/principal/subjects/${subjectId}`, { name, teacherId }));
}
