import { apiClient, unwrap } from "./client";
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  MyTodayStatus,
  SkippedClassReport,
  TeacherAttendanceDetail,
  TeacherAttendanceStatus,
  TeacherAttendanceTodayRow,
} from "../types/staffAttendance";

export function getMyTodayStatus(): Promise<MyTodayStatus> {
  return unwrap(apiClient.get("/api/teacher-attendance/me"));
}

export function setMyTeacherStatus(status: TeacherAttendanceStatus): Promise<void> {
  return unwrap(apiClient.post("/api/teacher-attendance/me", { status }));
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
