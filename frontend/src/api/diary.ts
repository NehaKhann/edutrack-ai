import { apiClient, unwrap } from "./client";
import type { DiaryEntry, DiarySubjectRow } from "../types/diary";

export function upsertDiaryEntry(params: {
  subjectId: number;
  date: string;
  content: string;
  pageNumber?: string;
  dueDate?: string;
  attachment?: File | null;
  draft?: boolean;
}): Promise<DiaryEntry> {
  const form = new FormData();
  form.append("subjectId", String(params.subjectId));
  form.append("date", params.date);
  form.append("content", params.content);
  if (params.pageNumber) form.append("pageNumber", params.pageNumber);
  if (params.dueDate) form.append("dueDate", params.dueDate);
  if (params.attachment) form.append("attachment", params.attachment);
  form.append("draft", String(params.draft ?? false));
  return unwrap(apiClient.post("/api/diary", form, { headers: { "Content-Type": "multipart/form-data" } }));
}

export function listMyDiaryEntries(date: string): Promise<DiaryEntry[]> {
  return unwrap(apiClient.get("/api/diary/mine", { params: { date } }));
}

export function listDiaryForClassSection(classSectionId: number, date: string): Promise<DiarySubjectRow[]> {
  return unwrap(apiClient.get("/api/principal/diary", { params: { classSectionId, date } }));
}

export function exportDiaryXlsx(classSectionId: number, from: string, to: string): Promise<Blob> {
  return apiClient
    .get("/api/principal/diary/export", { params: { classSectionId, from, to }, responseType: "blob" })
    .then((res) => res.data);
}

export async function downloadDiaryAttachment(diaryEntryId: number, filename: string): Promise<void> {
  const res = await apiClient.get(`/api/diary/${diaryEntryId}/attachment`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
