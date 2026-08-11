import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { Modal } from "../../components/Modal";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import * as staffApi from "../../api/staffAttendance";
import { errorMessage } from "../../api/client";
import { formatDate } from "../../utils/date";
import type { TeacherAttendanceDetail, TeacherAttendanceStatus, TeacherAttendanceTodayRow } from "../../types/staffAttendance";

const STATUS_LABEL: Record<TeacherAttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  LATE: "Late",
  HALF_DAY: "Half Day",
};

const METHOD_LABEL: Record<string, string> = { MANUAL: "Manual", FACE_RECOGNITION: "Face Recognition" };

const STATUS_BADGE: Record<TeacherAttendanceStatus, string> = {
  PRESENT: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
  ABSENT: "bg-coral-50 text-coral-700 ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20",
  ON_LEAVE: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20",
  LATE: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  HALF_DAY: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/[0.08] dark:text-slate-300 dark:ring-white/10",
};

function StatusBadgeChip({ status }: { status: TeacherAttendanceStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
        Not marked
      </span>
    );
  }
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", STATUS_BADGE[status])}>{STATUS_LABEL[status]}</span>;
}

export function TeacherAttendancePage() {
  const [rows, setRows] = useState<TeacherAttendanceTodayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    staffApi
      .getTeacherAttendanceToday()
      .then(setRows)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  const absentWithoutLeave = rows.filter((r) => r.absentWithoutLeave);
  const skippedNoReason = rows.filter((r) => r.skippedPeriodsCount > 0);

  return (
    <div>
      <PageHeader title="Teacher Attendance" description="Today's staff attendance, leave requests, and class-skip reports." />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {!loading && (absentWithoutLeave.length > 0 || skippedNoReason.length > 0) && (
        <div className="mb-4">
          <Alert type="warning">
            {absentWithoutLeave.length > 0 && (
              <>
                <strong>{absentWithoutLeave.length} teacher{absentWithoutLeave.length > 1 ? "s" : ""}</strong> absent without leave
                ({absentWithoutLeave.map((r) => r.teacherName).join(", ")})
                {skippedNoReason.length > 0 ? " · " : "."}
              </>
            )}
            {skippedNoReason.length > 0 && (
              <>
                <strong>
                  {skippedNoReason.reduce((sum, r) => sum + r.skippedPeriodsCount, 0)} class{skippedNoReason.reduce((sum, r) => sum + r.skippedPeriodsCount, 0) > 1 ? "es" : ""}
                </strong>{" "}
                skipped today — click a teacher to review.
              </>
            )}
          </Alert>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today — {formatDate(new Date().toISOString().slice(0, 10))}</h3>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No teachers yet" description="Teacher accounts will appear here once provisioned." />
          </div>
        ) : (
          <ResponsiveTable>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">Teacher</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Leave Reason</th>
                  <th className="px-5 py-3">Skipped Periods</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                {rows.map((r) => (
                  <tr key={r.teacherId} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => setSelectedTeacherId(r.teacherId)}>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{r.teacherName}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadgeChip status={r.status} />
                        {r.method === "FACE_RECOGNITION" && (
                          <span className="text-xs" title="Marked via Face Recognition">
                            📷
                          </span>
                        )}
                        {r.absentWithoutLeave && <ExclamationTriangleIcon className="h-4 w-4 text-coral-500" title="Absent without leave" />}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{r.leaveReason ?? "—"}</td>
                    <td className="px-5 py-3">
                      {r.skippedPeriodsCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-coral-50 px-2.5 py-0.5 text-[11px] font-semibold text-coral-700 ring-1 ring-inset ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20">
                          {r.skippedPeriodsCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant={r.pendingLeaveId ? "secondary" : "ghost"} onClick={(e) => { e.stopPropagation(); setSelectedTeacherId(r.teacherId); }}>
                        {r.pendingLeaveId ? "Review" : "View"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </Card>

      {selectedTeacherId && (
        <TeacherDetailModal teacherId={selectedTeacherId} onClose={() => setSelectedTeacherId(null)} onReviewed={load} />
      )}
    </div>
  );
}

function TeacherDetailModal({ teacherId, onClose, onReviewed }: { teacherId: number; onClose: () => void; onReviewed: () => void }) {
  const [detail, setDetail] = useState<TeacherAttendanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  function load() {
    setLoading(true);
    staffApi
      .getTeacherAttendanceDetail(teacherId)
      .then(setDetail)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  const pendingLeave = detail?.leaveHistory.find((l) => l.status === "PENDING");

  async function handleReview(approve: boolean) {
    if (!pendingLeave) return;
    setReviewing(true);
    try {
      if (approve) await staffApi.approveLeaveRequest(pendingLeave.id);
      else await staffApi.rejectLeaveRequest(pendingLeave.id);
      load();
      onReviewed();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReviewing(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={detail?.teacherName ?? "Teacher"} widthClass="max-w-lg">
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {loading || !detail ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Today</h4>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadgeChip status={detail.todayStatus} />
              {detail.todayMarkedAt && detail.todayMethod && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  at {new Date(detail.todayMarkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} via{" "}
                  <strong className="text-slate-700 dark:text-slate-200">{METHOD_LABEL[detail.todayMethod]}</strong>
                </span>
              )}
              {detail.todayLeaveReason && <span className="text-sm text-slate-600 dark:text-slate-300">— {detail.todayLeaveReason}</span>}
              {pendingLeave && (
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => handleReview(false)} loading={reviewing}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleReview(true)} loading={reviewing}>
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>

          {detail.skippedClasses.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Skipped Classes</h4>
              <div className="space-y-2">
                {detail.skippedClasses.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {s.subjectName} {s.period ? `· Period ${s.period}` : ""} · {formatDate(s.date)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Reason: {s.reason} · Substitute: {s.substituteTeacherName ?? "None"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Monthly Summary</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Present Days</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-teal-600 dark:text-teal-400">{detail.monthlyPresentDays}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Leaves Taken</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{detail.monthlyLeavesTaken}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Classes Skipped</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-coral-600 dark:text-coral-400">{detail.monthlyClassesSkipped}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Attendance %</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{detail.monthlyAttendancePercent}%</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Leave History</h4>
            {detail.leaveHistory.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No leave history.</p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-white/[0.08] dark:border-white/10">
                {detail.leaveHistory.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{l.leaveType}</span>{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatDate(l.fromDate)}
                        {l.toDate !== l.fromDate ? ` – ${formatDate(l.toDate)}` : ""}
                      </span>
                    </div>
                    <StatusBadgeLeave status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function StatusBadgeLeave({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    APPROVED: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
    REJECTED: "bg-coral-50 text-coral-700 ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20",
    CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/[0.08] dark:text-slate-400 dark:ring-white/10",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", map[status])}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}
