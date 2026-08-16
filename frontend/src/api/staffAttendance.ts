import { apiClient, unwrap } from "./client";
import type {
  AttendanceCorrectionRequest,
  AttendancePolicy,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  MyAttendanceSummary,
  MyTodayStatus,
  SkippedClassReport,
  TeacherAttendanceDetail,
  TeacherAttendanceStatus,
  TeacherAttendanceTodayRow,
} from "../types/staffAttendance";

export function getMyTodayStatus(): Promise<MyTodayStatus> {
  return unwrap(apiClient.get("/api/teacher-attendance/me"));
}

export function exportAttendanceXlsx(from: string, to: string): Promise<Blob> {
  return apiClient.get("/api/principal/teacher-attendance/export", { params: { from, to }, responseType: "blob" }).then((res) => res.data);
}

export function exportLeaveXlsx(from: string, to: string): Promise<Blob> {
  return apiClient.get("/api/principal/leave-requests/export", { params: { from, to }, responseType: "blob" }).then((res) => res.data);
}

export function getMyAttendanceSummary(): Promise<MyAttendanceSummary> {
  return unwrap(apiClient.get("/api/teacher-attendance/me/summary"));
}

export function setMyTeacherStatus(status: TeacherAttendanceStatus): Promise<void> {
  return unwrap(apiClient.post("/api/teacher-attendance/me", { status }));
}

export function markPresentViaFingerprint(): Promise<void> {
  return unwrap(apiClient.post("/api/teacher-attendance/me/fingerprint"));
}

export function getAttendancePolicy(): Promise<AttendancePolicy> {
  return unwrap(apiClient.get("/api/teacher-attendance/policy"));
}

export function updateAttendancePolicy(cutoffTime: string, autoAbsentTime: string): Promise<AttendancePolicy> {
  return unwrap(apiClient.put("/api/principal/attendance-policy", { cutoffTime, autoAbsentTime }));
}

export function overrideTeacherStatus(teacherId: number, status: TeacherAttendanceStatus, time: string): Promise<void> {
  return unwrap(apiClient.post(`/api/principal/teacher-attendance/${teacherId}/override`, { status, time }));
}

export function submitCorrectionRequest(params: {
  attendanceDate: string;
  requestedStatus?: TeacherAttendanceStatus;
  reason: string;
}): Promise<AttendanceCorrectionRequest> {
  return unwrap(apiClient.post("/api/attendance-corrections", params));
}

export function listMyCorrectionRequests(): Promise<AttendanceCorrectionRequest[]> {
  return unwrap(apiClient.get("/api/attendance-corrections/mine"));
}

export function cancelCorrectionRequest(id: number): Promise<AttendanceCorrectionRequest> {
  return unwrap(apiClient.post(`/api/attendance-corrections/${id}/cancel`));
}

export function listPendingCorrections(): Promise<AttendanceCorrectionRequest[]> {
  return unwrap(apiClient.get("/api/principal/attendance-corrections/pending"));
}

export function approveCorrectionRequest(id: number): Promise<AttendanceCorrectionRequest> {
  return unwrap(apiClient.post(`/api/principal/attendance-corrections/${id}/approve`));
}

export function rejectCorrectionRequest(id: number): Promise<AttendanceCorrectionRequest> {
  return unwrap(apiClient.post(`/api/principal/attendance-corrections/${id}/reject`));
}

export function applyForLeave(params: {
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  document?: File | null;
}): Promise<LeaveRequest> {
  const form = new FormData();
  form.append("leaveType", params.leaveType);
  form.append("fromDate", params.fromDate);
  form.append("toDate", params.toDate);
  form.append("reason", params.reason);
  if (params.document) form.append("document", params.document);
  return unwrap(apiClient.post("/api/leave-requests", form, { headers: { "Content-Type": "multipart/form-data" } }));
}

export function listMyLeaveRequests(): Promise<LeaveRequest[]> {
  return unwrap(apiClient.get("/api/leave-requests/mine"));
}

export function getMyLeaveBalance(): Promise<LeaveBalance> {
  return unwrap(apiClient.get("/api/leave-requests/balance"));
}

export function cancelLeaveRequest(id: number): Promise<LeaveRequest> {
  return unwrap(apiClient.post(`/api/leave-requests/${id}/cancel`));
}

export function approveLeaveRequest(id: number): Promise<LeaveRequest> {
  return unwrap(apiClient.post(`/api/leave-requests/${id}/approve`));
}

export function rejectLeaveRequest(id: number): Promise<LeaveRequest> {
  return unwrap(apiClient.post(`/api/leave-requests/${id}/reject`));
}

export function reportSkippedClass(params: {
  subjectId: number;
  date: string;
  period?: number;
  reason: string;
  substituteTeacherId?: number;
}): Promise<SkippedClassReport> {
  return unwrap(apiClient.post("/api/skipped-classes", params));
}

export function getTeacherAttendanceToday(): Promise<TeacherAttendanceTodayRow[]> {
  return unwrap(apiClient.get("/api/principal/teacher-attendance/today"));
}

export function getTeacherAttendanceDetail(teacherId: number): Promise<TeacherAttendanceDetail> {
  return unwrap(apiClient.get(`/api/principal/teacher-attendance/${teacherId}/detail`));
}
