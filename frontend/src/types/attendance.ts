export type StudentAttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

export interface StudentAttendanceRow {
  studentId: number;
  name: string;
  rollNumber: string;
  status: StudentAttendanceStatus | null;
}

export interface ClassAttendanceSummary {
  classSectionId: number;
  classSectionName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendancePercent: number;
  completed: boolean;
}
