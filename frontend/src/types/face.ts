export type FaceEnrollmentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface FaceStatus {
  enrolled: boolean;
  enrolledAt: string | null;
  status: FaceEnrollmentStatus | null;
  rejectionReason: string | null;
}

export interface FaceVerifyResult {
  matched: boolean;
  similarity: number;
  status: string | null;
  markedAt: string | null;
}

export interface PendingFaceEnrollment {
  teacherId: number;
  teacherName: string;
  submittedAt: string;
}
