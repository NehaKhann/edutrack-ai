import { apiClient, unwrap } from "./client";
import type { CoverageGridRow, SubjectCoverageDetail } from "../types";

export function getCoverageGrid(): Promise<CoverageGridRow[]> {
  return unwrap(apiClient.get("/api/principal/coverage/grid"));
}

export function getSubjectCoverageDetail(subjectId: number): Promise<SubjectCoverageDetail> {
  return unwrap(apiClient.get(`/api/principal/coverage/subjects/${subjectId}`));
}

export async function downloadCoverageReportPdf(): Promise<void> {
  const response = await apiClient.get("/api/principal/coverage/export/pdf", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "coverage-report.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
