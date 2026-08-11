export interface FaceStatus {
  enrolled: boolean;
  enrolledAt: string | null;
}

export interface FaceVerifyResult {
  matched: boolean;
  similarity: number;
  status: string | null;
  markedAt: string | null;
}
