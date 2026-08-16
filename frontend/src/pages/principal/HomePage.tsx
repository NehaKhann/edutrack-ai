import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  IdentificationIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UsersIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  TableCellsIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { StatCard } from "../../components/StatCard";
import { SkeletonCardGrid, SkeletonRows } from "../../components/Skeleton";
import { useAuth } from "../../auth/AuthContext";
import * as coverageApi from "../../api/coverage";
import * as attendanceApi from "../../api/attendance";
import * as staffApi from "../../api/staffAttendance";
import * as notificationsApi from "../../api/notifications";
import { isoDate } from "../../lib/download";
import type { CoverageGridRow } from "../../types";
import type { ClassAttendanceSummary } from "../../types/attendance";
import type { TeacherAttendanceTodayRow } from "../../types/staffAttendance";
import type { AppNotification } from "../../types/notification";

const QUICK_LINKS = [
  { to: "/principal/coverage", label: "Syllabus Coverage", icon: AcademicCapIcon },
  { to: "/principal/attendance", label: "Class Attendance", icon: ClipboardDocumentCheckIcon },
  { to: "/principal/teacher-attendance", label: "Teacher Attendance", icon: IdentificationIcon },
  { to: "/principal/diary", label: "Class Diary", icon: PencilSquareIcon },
  { to: "/principal/teachers", label: "Teacher Directory", icon: UsersIcon },
  { to: "/principal/timetable", label: "Timetable", icon: TableCellsIcon },
  { to: "/principal/audit-log", label: "Audit Log", icon: ShieldCheckIcon },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AttentionItem {
  key: string;
  icon: typeof ExclamationTriangleIcon;
  tone: "coral" | "amber";
  text: string;
  to: string;
}

const attentionTone: Record<AttentionItem["tone"], string> = {
  coral: "bg-coral-50 text-coral-600 dark:bg-coral-500/10 dark:text-coral-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
};

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coverage, setCoverage] = useState<CoverageGridRow[] | null>(null);
  const [attendance, setAttendance] = useState<ClassAttendanceSummary[] | null>(null);
  const [teacherToday, setTeacherToday] = useState<TeacherAttendanceTodayRow[] | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    const today = isoDate(new Date());
    coverageApi.getCoverageGrid().then(setCoverage).catch(() => setCoverage([]));
    attendanceApi.getAttendanceSummary(today).then(setAttendance).catch(() => setAttendance([]));
    staffApi.getTeacherAttendanceToday().then(setTeacherToday).catch(() => setTeacherToday([]));
    notificationsApi
      .list()
      .then((list) => setNotifications(list.slice(0, 5)))
      .catch(() => setNotifications([]));
  }, []);

  const statsLoading = coverage === null || attendance === null || teacherToday === null;

  const plannedTotal = (coverage ?? []).reduce((s, r) => s + r.plannedToDateCount, 0);
  const coveredTotal = (coverage ?? []).reduce((s, r) => s + r.coveredCount, 0);
  const coveragePercent = plannedTotal === 0 ? null : Math.round((coveredTotal / plannedTotal) * 100);
  const behindCount = (coverage ?? []).filter((r) => r.status === "BEHIND").length;

  const classesTotal = (attendance ?? []).length;
  const classesMarked = (attendance ?? []).filter((c) => c.completed).length;
  const studentsPresent = (attendance ?? []).reduce((s, c) => s + c.present, 0);
  const studentsTotal = (attendance ?? []).reduce((s, c) => s + c.total, 0);
  const studentAttendancePercent = studentsTotal === 0 ? null : Math.round((studentsPresent / studentsTotal) * 100);

  const teacherPresent = (teacherToday ?? []).filter((t) => t.status === "PRESENT" || t.status === "LATE" || t.status === "HALF_DAY").length;
  const teacherTotal = (teacherToday ?? []).length;
  const absentWithoutLeave = (teacherToday ?? []).filter((t) => t.absentWithoutLeave);
  const pendingLeaveCount = (teacherToday ?? []).filter((t) => t.pendingLeaveId != null).length;

  const attentionItems: AttentionItem[] = [
    absentWithoutLeave.length > 0 && {
      key: "absent",
      icon: ExclamationTriangleIcon,
      tone: "coral",
      text: `${absentWithoutLeave.length} teacher${absentWithoutLeave.length > 1 ? "s" : ""} absent without leave today — ${absentWithoutLeave
        .map((t) => t.teacherName)
        .join(", ")}`,
      to: "/principal/teacher-attendance",
    },
    pendingLeaveCount > 0 && {
      key: "leave",
      icon: ClipboardDocumentListIcon,
      tone: "amber",
      text: `${pendingLeaveCount} leave request${pendingLeaveCount > 1 ? "s" : ""} waiting for review`,
      to: "/principal/teacher-attendance",
    },
    behindCount > 0 && {
      key: "coverage",
      icon: AcademicCapIcon,
      tone: "amber",
      text: `${behindCount} subject${behindCount > 1 ? "s" : ""} behind schedule`,
      to: "/principal/coverage",
    },
    classesTotal > 0 &&
      classesTotal - classesMarked > 0 && {
        key: "attendance",
        icon: ClipboardDocumentCheckIcon,
        tone: "amber",
        text: `${classesTotal - classesMarked} class${classesTotal - classesMarked > 1 ? "es" : ""} haven't marked attendance today`,
        to: "/principal/attendance",
      },
  ].filter(Boolean) as AttentionItem[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0] ?? ""}`}
        description={new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      />

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Needs your attention</h3>
        </CardHeader>
        <CardBody className="space-y-1">
          {statsLoading ? (
            <SkeletonRows count={2} />
          ) : attentionItems.length === 0 ? (
            <div className="flex items-center gap-2.5 py-2 text-sm text-slate-500 dark:text-slate-400">
              <CheckCircleIcon className="h-4.5 w-4.5 text-teal-500" />
              All caught up — nothing needs your review right now.
            </div>
          ) : (
            attentionItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.to)}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.05]"
              >
                <span className={clsx("grid h-8 w-8 shrink-0 place-items-center rounded-full", attentionTone[item.tone])}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{item.text}</span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" />
              </button>
            ))
          )}
        </CardBody>
      </Card>

      {statsLoading ? (
        <SkeletonCardGrid count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<AcademicCapIcon className="h-3.5 w-3.5" />}
            label="Syllabus Coverage"
            value={coveragePercent === null ? "—" : `${coveragePercent}%`}
            tone={behindCount > 0 ? "amber" : "teal"}
            hint={`${coveredTotal}/${plannedTotal} lessons covered`}
          />
          <StatCard
            icon={<ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />}
            label="Attendance Today"
            value={studentAttendancePercent === null ? "—" : `${studentAttendancePercent}%`}
            tone="brand"
            hint={`${classesMarked}/${classesTotal} classes marked`}
          />
          <StatCard
            icon={<IdentificationIcon className="h-3.5 w-3.5" />}
            label="Teachers Present"
            value={`${teacherPresent}/${teacherTotal}`}
            tone="teal"
          />
          <StatCard
            icon={<ClipboardDocumentListIcon className="h-3.5 w-3.5" />}
            label="Pending Leave Requests"
            value={pendingLeaveCount}
            tone={pendingLeaveCount > 0 ? "amber" : "default"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Quick links</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Card key={link.to} interactive onClick={() => navigate(link.to)} className="cursor-pointer">
                <CardBody className="flex flex-col items-start gap-2.5 py-5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                    <link.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{link.label}</span>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Recent activity</h3>
          <Card>
            <CardBody className="space-y-1 py-2">
              {notifications === null ? (
                <SkeletonRows count={3} />
              ) : notifications.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">No recent activity.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => n.link && navigate(n.link)}
                    disabled={!n.link}
                    className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2.5 text-left transition-colors enabled:hover:bg-slate-50 dark:enabled:hover:bg-white/[0.05]"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-200">{n.message}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</span>
                  </button>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
