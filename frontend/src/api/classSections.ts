import { apiClient, unwrap } from "./client";
import type { ClassSectionSummary } from "../types/roster";

export function listClassSections(): Promise<ClassSectionSummary[]> {
  return unwrap(apiClient.get("/api/principal/class-sections"));
}

export function createClass(className: string): Promise<ClassSectionSummary> {
  return unwrap(apiClient.post("/api/principal/classes", { className }));
}

export function addSection(className: string, sectionName: string): Promise<ClassSectionSummary> {
  return unwrap(apiClient.post("/api/principal/classes/sections", { className, sectionName }));
}
