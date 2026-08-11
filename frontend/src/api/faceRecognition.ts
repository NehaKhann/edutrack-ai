import { apiClient, unwrap } from "./client";
import type { FaceStatus, FaceVerifyResult } from "../types/face";

export function getFaceStatus(): Promise<FaceStatus> {
  return unwrap(apiClient.get("/api/face/status"));
}

export function enrollFace(embedding: number[]): Promise<void> {
  return unwrap(apiClient.post("/api/face/enroll", { embedding }));
}

export function verifyFace(embedding: number[]): Promise<FaceVerifyResult> {
  return unwrap(apiClient.post("/api/face/verify", { embedding }));
}
