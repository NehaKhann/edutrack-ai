import { apiClient, unwrap } from "./client";
import type { SyllabusDto, Topic } from "../types";

export function listSyllabi(subjectId: number): Promise<SyllabusDto[]> {
  return unwrap(apiClient.get("/api/syllabus", { params: { subjectId } }));
}

export function uploadSyllabus(params: {
  subjectId: number;
  term: string;
  termStartDate: string;
  file: File;
  onProgress?: (pct: number) => void;
}): Promise<SyllabusDto> {
  const form = new FormData();
  form.append("subjectId", String(params.subjectId));
  form.append("term", params.term);
  form.append("termStartDate", params.termStartDate);
  form.append("file", params.file);
  return unwrap(
    apiClient.post("/api/syllabus", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (params.onProgress && evt.total) params.onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    })
  );
}

export function extractTopics(syllabusId: number): Promise<Topic[]> {
  return unwrap(apiClient.post(`/api/syllabus/${syllabusId}/extract-topics`));
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
