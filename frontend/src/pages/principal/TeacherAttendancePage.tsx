import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExclamationTriangleIcon, CheckCircleIcon, CalendarDaysIcon, DocumentTextIcon, Cog6ToothIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { Modal } from "../../components/Modal";
import { Field, Select, TextInput } from "../../components/FormFields";
import { DatePicker } from "../../components/DatePicker";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { StatCard } from "../../components/StatCard";
import * as staffApi from "../../api/staffAttendance";
import { errorMessage } from "../../api/client";
import { formatDate } from "../../utils/date";
import { downloadBlob, isoDate } from "../../lib/download";
import type {
  AttendanceCorrectionRequest,
  AttendancePolicy,
  TeacherAttendanceDetail,
  TeacherAttendanceStatus,
  TeacherAttendanceTodayRow,
} from "../../types/staffAttendance";

const STATUS_LABEL: Record<TeacherAttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  LATE: "Late",
  HALF_DAY: "Half Day",
};

const METHOD_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  FACE_RECOGNITION: "Face Recognition",
  FINGERPRINT: "Fingerprint",
  AUTO: "Auto-marked",
  PRINCIPAL_OVERRIDE: "Corrected by Principal",
};

const STATUS_BADGE: Record<TeacherAttendanceStatus, string> = {
  PRESENT: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
  ABSENT: "bg-coral-50 text-coral-700 ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20",
  ON_LEAVE: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20",
  LATE: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  HALF_DAY: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/[0.08] dark:text-slate-300 dark:ring-white/10",
};

/** "09:00:00" -> "9:00 AM" */
function formatTimeOfDay(hms: string): string {
  const [h, m] = hms.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TeacherAttendanceTodayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "not_marked" | "on_leave" | "skipped" | "absent_no_leave" | "correction_pending">("all");
  const [policyOpen, setPolicyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);

  useEffect(() => {
    load();
    loadPendingCorrections();
    staffApi.getAttendancePolicy().then(setPolicy).catch(() => {});
  }, []);

  // Deep link from a correction-request notification, e.g. /principal/teacher-attendance?teacherId=3.
  useEffect(() => {
    const teacherId = Number(searchParams.get("teacherId"));
    if (teacherId) {
      setSelectedTeacherId(teacherId);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function load() {
    setLoading(true);
    staffApi
      .getTeacherAttendanceToday()
      .then(setRows)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  function loadPendingCorrections() {
    staffApi.listPendingCorrections().then(setPendingCorrections).catch(() => {});
  }

  const absentWithoutLeave = rows.filter((r) => r.absentWithoutLeave);
  const skippedNoReason = rows.filter((r) => r.skippedPeriodsCount > 0);

  const presentCount = rows.filter((r) => r.status === "PRESENT").length;
  const onLeaveCount = rows.filter((r) => r.status === "ON_LEAVE").length;
  const notMarkedCount = rows.filter((r) => r.status === null).length;
  const skippedTotal = rows.reduce((sum, r) => sum + r.skippedPeriodsCount, 0);

  const pendingCorrectionTeacherIds = new Set(pendingCorrections.map((r) => r.teacherId));

  const filteredRows = rows.filter((r) => {
    if (filter === "not_marked") return r.status === null;
    if (filter === "on_leave") return r.status === "ON_LEAVE";
    if (filter === "skipped") return r.skippedPeriodsCount > 0;
    if (filter === "absent_no_leave") return r.absentWithoutLeave;
    if (filter === "correction_pending") return pendingCorrectionTeacherIds.has(r.teacherId);
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Teacher Attendance"
        description="Today's staff attendance, leave requests, and class-skip reports."
        actions={
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => setExportOpen(true)}>
              <ArrowDownTrayIcon className="h-4 w-4" /> Export
            </Button>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => setPolicyOpen(true)}>
              <Cog6ToothIcon className="h-4 w-4" /> Attendance Policy
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<CheckCircleIcon className="h-3.5 w-3.5" />} label="Present Today" value={presentCount} tone="teal" />
        <StatCard icon={<CalendarDaysIcon className="h-3.5 w-3.5" />} label="On Leave" value={onLeaveCount} tone="brand" />
        <StatCard
          icon={<ExclamationTriangleIcon className="h-3.5 w-3.5" />}
          label="Not Marked Yet"
          value={notMarkedCount}
          tone={notMarkedCount > 0 ? "amber" : "default"}
          hint={policy ? `Turns Absent after ${formatTimeOfDay(policy.autoAbsentTime)} if still unmarked` : undefined}
        />
        <StatCard
          icon={<DocumentTextIcon className="h-3.5 w-3.5" />}
          label="Classes Skipped Today"
          value={skippedTotal}
          tone={skippedTotal > 0 ? "coral" : "default"}
        />
      </div>

      {!loading && pendingCorrections.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Pending Attendance Corrections ({pendingCorrections.length})
            </h3>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
            {pendingCorrections.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedTeacherId(r.teacherId)}
                className="flex w-full items-start justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {r.teacherName}{" "}
                    <span className="font-normal text-slate-400 dark:text-slate-500">
                      · {formatDate(r.attendanceDate)}
                      {r.requestedStatus ? ` · wants ${STATUS_LABEL[r.requestedStatus]}` : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{r.reason}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Review
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {!loading && (absentWithoutLeave.length > 0 || skippedNoReason.length > 0) && (
        <div className="mb-4">
          <Alert type="warning">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {absentWithoutLeave.length > 0 && (
                <span>
                  <strong>{absentWithoutLeave.length}</strong> absent without leave{" "}
                  <button onClick={() => setFilter("absent_no_leave")} className="font-semibold underline underline-offset-2 hover:no-underline">
                    view
                  </button>
                  {skippedNoReason.length > 0 ? " ·" : ""}
                </span>
              )}
              {skippedNoReason.length > 0 && (
                <span>
                  <strong>{skippedNoReason.reduce((sum, r) => sum + r.skippedPeriodsCount, 0)}</strong> class
                  {skippedNoReason.reduce((sum, r) => sum + r.skippedPeriodsCount, 0) > 1 ? "es" : ""} skipped today{" "}
                  <button onClick={() => setFilter("skipped")} className="font-semibold underline underline-offset-2 hover:no-underline">
                    view
                  </button>
                </span>
              )}
            </div>
          </Alert>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today — {formatDate(new Date().toISOString().slice(0, 10))}</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "all", label: "All" },
                { value: "not_marked", label: "Not Marked" },
                { value: "on_leave", label: "On Leave" },
                { value: "skipped", label: "Has Skipped Classes" },
                { value: "absent_no_leave", label: "Absent w/o Leave" },
                { value: "correction_pending", label: "Correction Pending" },
              ] as const
            ).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === f.value
                    ? "border-transparent bg-brand-600 text-white"
                    : "border-slate-300 bg-white/80 text-slate-600 hover:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No teachers yet" description="Teacher accounts will appear here once provisioned." />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No teachers match" description="Try a different quick filter." />
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
                {filteredRows.map((r) => (
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-0.5 text-[11px] font-bold text-coral-700 ring-1 ring-inset ring-coral-200 dark:bg-coral-500/20 dark:text-coral-300 dark:ring-coral-500/30">
                          <ExclamationTriangleIcon className="h-3 w-3" /> {r.skippedPeriodsCount}
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

      {policyOpen && (
        <AttendancePolicyModal
          onClose={() => {
            setPolicyOpen(false);
            staffApi.getAttendancePolicy().then(setPolicy).catch(() => {});
          }}
        />
      )}

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}

      {selectedTeacherId && (
        <TeacherDetailModal
          teacherId={selectedTeacherId}
          pendingCorrection={pendingCorrections.find((r) => r.teacherId === selectedTeacherId) ?? null}
          onClose={() => setSelectedTeacherId(null)}
          onReviewed={() => {
            load();
            loadPendingCorrections();
          }}
        />
      )}
    </div>
  );
}

function TeacherDetailModal({
  teacherId,
  pendingCorrection,
  onClose,
  onReviewed,
}: {
  teacherId: number;
  pendingCorrection: AttendanceCorrectionRequest | null;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [detail, setDetail] = useState<TeacherAttendanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewingCorrection, setReviewingCorrection] = useState(false);
  const [correctingOpen, setCorrectingOpen] = useState(false);
  const [correctStatus, setCorrectStatus] = useState<TeacherAttendanceStatus>("PRESENT");
  const [correctTime, setCorrectTime] = useState("09:00");
  const [correcting, setCorrecting] = useState(false);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);

  useEffect(() => {
    load();
    staffApi
      .getAttendancePolicy()
      .then((p) => {
        setPolicy(p);
        setCorrectTime(p.cutoffTime.slice(0, 5));
      })
      .catch(() => {});
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

  async function handleCorrect() {
    if (!correctTime) return;
    setCorrecting(true);
    try {
      await staffApi.overrideTeacherStatus(teacherId, correctStatus, `${correctTime}:00`);
      setCorrectingOpen(false);
      load();
      onReviewed();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCorrecting(false);
    }
  }

  async function handleReviewCorrection(approve: boolean) {
    if (!pendingCorrection) return;
    setReviewingCorrection(true);
    try {
      if (approve) {
        await staffApi.approveCorrectionRequest(pendingCorrection.id);
        // Pre-fill the correction control with what the teacher asked for — the Principal still
        // confirms and clicks Save Correction to actually apply it.
        setCorrectStatus(pendingCorrection.requestedStatus ?? detail?.todayStatus ?? "PRESENT");
        setCorrectingOpen(true);
      } else {
        await staffApi.rejectCorrectionRequest(pendingCorrection.id);
      }
      onReviewed();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReviewingCorrection(false);
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
          {pendingCorrection && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Correction Request — {formatDate(pendingCorrection.attendanceDate)}
              </h4>
              <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{pendingCorrection.reason}</p>
              {pendingCorrection.requestedStatus && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Requested status: <strong>{STATUS_LABEL[pendingCorrection.requestedStatus]}</strong>
                </p>
              )}
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" variant="danger" onClick={() => handleReviewCorrection(false)} loading={reviewingCorrection}>
                  Reject
                </Button>
                <Button size="sm" onClick={() => handleReviewCorrection(true)} loading={reviewingCorrection}>
                  Approve
                </Button>
              </div>
            </div>
          )}

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
              {!pendingLeave && !correctingOpen && (
                <button
                  onClick={() => {
                    setCorrectStatus(detail.todayStatus ?? "PRESENT");
                    setCorrectingOpen(true);
                  }}
                  className="ml-auto text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  Correct today's status
                </button>
              )}
            </div>

            {correctingOpen && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={correctStatus} onChange={(e) => setCorrectStatus(e.target.value as TeacherAttendanceStatus)} className="w-40">
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <TextInput type="time" value={correctTime} onChange={(e) => setCorrectTime(e.target.value)} className="w-32" />
                  <Button size="sm" onClick={handleCorrect} loading={correcting} disabled={!correctTime}>
                    Save Correction
                  </Button>
                  <button
                    onClick={() => setCorrectingOpen(false)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  Enter the actual time this happened at{policy ? ` — defaults to the ${policy.cutoffTime.slice(0, 5)} cutoff` : ""}, not the time you're saving this.
                </p>
              </div>
            )}
          </div>

          {detail.skippedClasses.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Today's Skipped Classes</h4>
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
                  <div key={l.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{l.leaveType}</span>{" "}
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatDate(l.fromDate)}
                          {l.toDate !== l.fromDate ? ` – ${formatDate(l.toDate)}` : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{l.reason}</p>
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

function ExportModal({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [from, setFrom] = useState(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(isoDate(now));
  const [downloading, setDownloading] = useState<"attendance" | "leave" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(kind: "attendance" | "leave") {
    setDownloading(kind);
    setError(null);
    try {
      const blob = kind === "attendance" ? await staffApi.exportAttendanceXlsx(from, to) : await staffApi.exportLeaveXlsx(from, to);
      downloadBlob(blob, `${kind === "attendance" ? "attendance" : "leave-requests"}-${from}-to-${to}.xlsx`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Modal open onClose={onClose} title="Export Records" widthClass="max-w-sm">
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Field label="From">
            <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} maxDate={to} />
          </Field>
          <Field label="To">
            <DatePicker value={to} onChange={(e) => setTo(e.target.value)} minDate={from} maxDate={isoDate(now)} />
          </Field>
        </div>
        <Button className="w-full justify-center" variant="secondary" onClick={() => handleExport("attendance")} loading={downloading === "attendance"}>
          <ArrowDownTrayIcon className="h-4 w-4" /> Export Attendance (.xlsx)
        </Button>
        <Button className="w-full justify-center" variant="secondary" onClick={() => handleExport("leave")} loading={downloading === "leave"}>
          <ArrowDownTrayIcon className="h-4 w-4" /> Export Leave Requests (.xlsx)
        </Button>
      </div>
    </Modal>
  );
}

function AttendancePolicyModal({ onClose }: { onClose: () => void }) {
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [cutoffTime, setCutoffTime] = useState("09:00");
  const [autoAbsentTime, setAutoAbsentTime] = useState("11:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi
      .getAttendancePolicy()
      .then((p) => {
        setPolicy(p);
        setCutoffTime(p.cutoffTime.slice(0, 5));
        setAutoAbsentTime(p.autoAbsentTime.slice(0, 5));
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await staffApi.updateAttendancePolicy(`${cutoffTime}:00`, `${autoAbsentTime}:00`);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Attendance Policy" widthClass="max-w-sm">
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {loading || !policy ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Applies to every teacher self-marking their own attendance (face scan, fingerprint, or manual).
          </p>
          <Field label="Late cutoff" hint="Marking after this time counts as Late instead of Present.">
            <TextInput type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} />
          </Field>
          <Field label="Auto-absent time" hint="Not marked at all by this time counts as Absent without leave.">
            <TextInput type="time" value={autoAbsentTime} onChange={(e) => setAutoAbsentTime(e.target.value)} />
          </Field>
          <Button onClick={handleSave} loading={saving} className="w-full justify-center">
            Save Policy
          </Button>
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
