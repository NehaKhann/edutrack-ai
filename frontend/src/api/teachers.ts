import { apiClient, unwrap } from "./client";
import type { TeacherSummary } from "../types/roster";

export function listTeachers(): Promise<TeacherSummary[]> {
  return unwrap(apiClient.get("/api/teachers"));
}
