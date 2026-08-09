import { apiClient, unwrap } from "./client";
import type { LessonPlanEntry } from "../types";

export function getToday(subjectId: number, date?: string): Promise<LessonPlanEntry[]> {
  return unwrap(apiClient.get("/api/lesson-plan/today", { params: { subjectId, date } }));
}

export function addEntry(subjectId: number, topicId: number, plannedDate?: string): Promise<LessonPlanEntry> {
  return unwrap(apiClient.post("/api/lesson-plan", { subjectId, topicId, plannedDate }));
}

export function changeEntryTopic(entryId: number, topicId: number): Promise<LessonPlanEntry> {
  return unwrap(apiClient.put(`/api/lesson-plan/${entryId}/topic`, { topicId }));
}

export function confirmEntry(entryId: number, status: "COVERED" | "MISSED", reason?: string): Promise<LessonPlanEntry> {
  return unwrap(apiClient.post(`/api/lesson-plan/${entryId}/confirm`, { status, reason }));
}
