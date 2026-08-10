import { apiClient, unwrap, unwrapWithMessage } from "./client";
import type { DocumentPreviewInfo, SyllabusDto, SyllabusDocument, SyllabusUploadResult, Topic } from "../types";

export function listSyllabi(subjectId: number): Promise<SyllabusDto[]> {
  return unwrap(apiClient.get("/api/syllabus", { params: { subjectId } }));
}

function filesFormData(files: File[], manualText?: string): FormData {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  if (manualText && manualText.trim()) form.append("manualText", manualText.trim());
  return form;
}

export function createSyllabus(params: {
  subjectId: number;
  term: string;
  termStartDate: string;
  files: File[];
  manualText?: string;
  onProgress?: (pct: number) => void;
}): Promise<SyllabusUploadResult> {
  const form = filesFormData(params.files, params.manualText);
  form.append("subjectId", String(params.subjectId));
  form.append("term", params.term);
  form.append("termStartDate", params.termStartDate);
  return unwrap(
    apiClient.post("/api/syllabus", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (params.onProgress && evt.total) params.onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    })
  );
}

export function addDocuments(
  syllabusId: number,
  files: File[],
  manualText?: string,
  onProgress?: (pct: number) => void
): Promise<SyllabusUploadResult> {
  const form = filesFormData(files, manualText);
  return unwrap(
    apiClient.post(`/api/syllabus/${syllabusId}/documents`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    })
  );
}

export function getPreviewInfo(documentId: number): Promise<DocumentPreviewInfo> {
  return unwrap(apiClient.get(`/api/syllabus/documents/${documentId}/preview-info`));
}

export async function getPreviewImageUrl(documentId: number, page: number): Promise<string> {
  const res = await apiClient.get(`/api/syllabus/documents/${documentId}/preview/${page}`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export function listDocuments(syllabusId: number): Promise<SyllabusDocument[]> {
  return unwrap(apiClient.get(`/api/syllabus/${syllabusId}/documents`));
}

export function updateDocumentText(documentId: number, extractedText: string): Promise<SyllabusDocument> {
  return unwrap(apiClient.put(`/api/syllabus/documents/${documentId}`, { extractedText }));
}

export function deleteDocument(documentId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/syllabus/documents/${documentId}`));
}

export function confirmSyllabus(syllabusId: number): Promise<SyllabusDto> {
  return unwrap(apiClient.post(`/api/syllabus/${syllabusId}/confirm`));
}

export function unconfirmSyllabus(syllabusId: number): Promise<SyllabusDto> {
  return unwrap(apiClient.post(`/api/syllabus/${syllabusId}/unconfirm`));
}

export function extractTopics(syllabusId: number): Promise<{ data: Topic[]; message: string | null }> {
  return unwrapWithMessage(apiClient.post(`/api/syllabus/${syllabusId}/extract-topics`));
}

export function listTopics(syllabusId: number): Promise<Topic[]> {
  return unwrap(apiClient.get(`/api/syllabus/${syllabusId}/topics`));
}

export function createTopic(
  syllabusId: number,
  payload: { title: string; startWeek?: number; endWeek?: number; plannedStartDate: string; plannedEndDate: string }
): Promise<Topic> {
  return unwrap(apiClient.post(`/api/syllabus/${syllabusId}/topics`, payload));
}

export function updateTopic(
  topicId: number,
  payload: { title: string; startWeek?: number; endWeek?: number; plannedStartDate: string; plannedEndDate: string }
): Promise<Topic> {
  return unwrap(apiClient.put(`/api/topics/${topicId}`, payload));
}

export function deleteTopic(topicId: number): Promise<void> {
  return unwrap(apiClient.delete(`/api/topics/${topicId}`));
}

export function reorderTopics(syllabusId: number, topicIdsInOrder: number[]): Promise<Topic[]> {
  return unwrap(apiClient.post(`/api/syllabus/${syllabusId}/topics/reorder`, { topicIdsInOrder }));
}
