import { apiClient, unwrap } from "./client";
import type { ClassSectionSummary } from "../types/roster";

export function listClassSections(): Promise<ClassSectionSummary[]> {
  return unwrap(apiClient.get("/api/principal/class-sections"));
}
