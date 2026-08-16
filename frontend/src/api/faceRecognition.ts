import { apiClient, unwrap } from "./client";
import type { FaceStatus, FaceVerifyResult, PendingFaceEnrollment } from "../types/face";

export function getFaceStatus(): Promise<FaceStatus> {
  return unwrap(apiClient.get("/api/face/status"));
}

/** Photo is required — the Principal reviews it before this enrollment can be used for attendance. */
export function enrollFace(embedding: number[], photo: Blob): Promise<void> {
  const form = new FormData();
  form.append("embedding", JSON.stringify(embedding));
  form.append("photo", photo, "face-enrollment.jpg");
  return unwrap(apiClient.post("/api/face/enroll", form, { headers: { "Content-Type": "multipart/form-data" } }));
}

export function verifyFace(embedding: number[]): Promise<FaceVerifyResult> {
  return unwrap(apiClient.post("/api/face/verify", { embedding }));
}

export function listPendingFaceEnrollments(): Promise<PendingFaceEnrollment[]> {
  return unwrap(apiClient.get("/api/principal/face-enrollments/pending"));
}

export function faceEnrollmentPhotoPath(teacherId: number): string {
  return `/api/principal/face-enrollments/${teacherId}/photo`;
}

export function approveFaceEnrollment(teacherId: number): Promise<void> {
  return unwrap(apiClient.post(`/api/principal/face-enrollments/${teacherId}/approve`));
}

export function rejectFaceEnrollment(teacherId: number, reason?: string): Promise<void> {
  return unwrap(apiClient.post(`/api/principal/face-enrollments/${teacherId}/reject`, { reason }));
}
