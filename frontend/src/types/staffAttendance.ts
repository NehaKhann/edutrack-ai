export type TeacherAttendanceStatus = "PRESENT" | "ABSENT" | "ON_LEAVE" | "LATE" | "HALF_DAY";
export type AttendanceMethod = "MANUAL" | "FACE_RECOGNITION" | "FINGERPRINT" | "AUTO" | "PRINCIPAL_OVERRIDE";
export type LeaveType = "SICK" | "CASUAL" | "EMERGENCY" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface MyTodayStatus {
  status: TeacherAttendanceStatus | null;
  method: AttendanceMethod | null;
  markedAt: string | null;
}

export interface MyAttendanceSummary {
  weekPresent: number;
  weekAbsent: number;
  weekLate: number;
  weekOnLeave: number;
  weekHalfDay: number;
  monthAttendancePercent: number;
}

export interface AttendancePolicy {
  cutoffTime: string;
  autoAbsentTime: string;
}

export interface AttendanceCorrectionRequest {
  id: number;
  teacherId: number;
  teacherName: string;
  attendanceDate: string;
  requestedStatus: TeacherAttendanceStatus | null;
  reason: string;
  status: LeaveStatus;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface LeaveRequest {
  id: number;
  teacherId: number;
  teacherName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  hasDocument: boolean;
  documentFilename: string | null;
  status: LeaveStatus;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface LeaveBalanceEntry {
  leaveType: LeaveType;
  entitlement: number;
  used: number;
  remaining: number;
}

export interface LeaveBalance {
  balances: LeaveBalanceEntry[];
}

export interface SkippedClassReport {
  id: number;
  subjectId: number;
  subjectName: string;
  date: string;
  period: number | null;
  reason: string;
  substituteTeacherId: number | null;
  substituteTeacherName: string | null;
}

export interface TeacherAttendanceTodayRow {
  teacherId: number;
  teacherName: string;
  status: TeacherAttendanceStatus | null;
  method: AttendanceMethod | null;
  leaveReason: string | null;
  pendingLeaveId: number | null;
  skippedPeriodsCount: number;
  absentWithoutLeave: boolean;
}

export interface TeacherAttendanceDetail {
  teacherId: number;
  teacherName: string;
  todayStatus: TeacherAttendanceStatus | null;
  todayMethod: AttendanceMethod | null;
  todayMarkedAt: string | null;
  todayLeaveReason: string | null;
  skippedClasses: SkippedClassReport[];
  leaveHistory: LeaveRequest[];
  monthlyPresentDays: number;
  monthlyLeavesTaken: number;
  monthlyClassesSkipped: number;
  monthlyAttendancePercent: number;
}
