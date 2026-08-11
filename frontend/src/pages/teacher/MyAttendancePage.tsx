import { useEffect, useState } from "react";
import { CameraIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput, Select } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { ConfirmModal } from "../../components/ConfirmModal";
import { FaceScanModal } from "../../components/FaceScanModal";
import { SegmentedControl, type SegmentedOption } from "../../components/SegmentedControl";
import { getMySubjects } from "../../api/subjects";
import { listTeachers } from "../../api/teachers";
import * as staffApi from "../../api/staffAttendance";
import * as faceApi from "../../api/faceRecognition";
import { errorMessage } from "../../api/client";
import { formatDate } from "../../utils/date";
import type { Subject } from "../../types";
import type { FaceStatus } from "../../types/face";
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  MyTodayStatus,
  TeacherAttendanceStatus,
} from "../../types/staffAttendance";
import type { TeacherSummary } from "../../types/roster";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STATUS_OPTIONS: SegmentedOption<TeacherAttendanceStatus>[] = [
  { value: "PRESENT", label: "Present", activeClass: "bg-teal-500 text-white" },
  { value: "ABSENT", label: "Absent", activeClass: "bg-coral-500 text-white" },
  { value: "ON_LEAVE", label: "On Leave", activeClass: "bg-brand-500 text-white" },
  { value: "LATE", label: "Late", activeClass: "bg-amber-500 text-white" },
  { value: "HALF_DAY", label: "Half Day", activeClass: "bg-navy-500 text-white" },
];

const STATUS_LABEL: Record<TeacherAttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  LATE: "Late",
  HALF_DAY: "Half Day",
};

const METHOD_LABEL: Record<string, string> = { MANUAL: "Manual entry", FACE_RECOGNITION: "Face Recognition" };

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "SICK", label: "Sick Leave" },
  { value: "CASUAL", label: "Casual Leave" },
  { value: "EMERGENCY", label: "Emergency Leave" },
  { value: "OTHER", label: "Other" },
];

const LEAVE_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  APPROVED: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
  REJECTED: "bg-coral-50 text-coral-700 ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/[0.08] dark:text-slate-400 dark:ring-white/10",
};

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function MyAttendancePage() {
  const [error, setError] = useState<string | null>(null);

  const [myToday, setMyToday] = useState<MyTodayStatus | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [scanMode, setScanMode] = useState<"enroll" | "verify" | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [leaveType, setLeaveType] = useState<LeaveType>("SICK");
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [skipSubjectId, setSkipSubjectId] = useState<number | null>(null);
  const [skipDate, setSkipDate] = useState(today());
  const [skipPeriod, setSkipPeriod] = useState(1);
  const [skipReason, setSkipReason] = useState("");
  const [substituteId, setSubstituteId] = useState<string>("");
  const [submittingSkip, setSubmittingSkip] = useState(false);
  const [skipSaved, setSkipSaved] = useState(false);
  const [skippedClasses, setSkippedClasses] = useState<{ subjectName: string; date: string; period: number | null; reason: string; substituteTeacherName: string | null }[]>([]);

  const [historyTab, setHistoryTab] = useState<"leave" | "skip">("leave");

  useEffect(() => {
    refreshToday();
    faceApi.getFaceStatus().then(setFaceStatus).catch((e) => setError(errorMessage(e)));
    staffApi.getMyLeaveBalance().then(setLeaveBalance).catch((e) => setError(errorMessage(e)));
    getMySubjects()
      .then((subs) => {
        setSubjects(subs);
        if (subs.length > 0) setSkipSubjectId(subs[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
    listTeachers().then(setTeachers).catch((e) => setError(errorMessage(e)));
    refreshLeaveHistory();
  }, []);

  function refreshToday() {
    staffApi.getMyTodayStatus().then(setMyToday).catch((e) => setError(errorMessage(e)));
  }

  function refreshLeaveHistory() {
    staffApi.listMyLeaveRequests().then(setLeaveHistory).catch((e) => setError(errorMessage(e)));
  }

  async function handleManualStatusChange(status: TeacherAttendanceStatus) {
    setSavingStatus(true);
    try {
      await staffApi.setMyTeacherStatus(status);
      refreshToday();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingStatus(false);
    }
  }

  function handleScanClosed() {
    setScanMode(null);
    refreshToday();
    faceApi.getFaceStatus().then(setFaceStatus).catch(() => {});
  }

  async function handleApplyLeave() {
    if (!reason.trim()) return;
    setSubmittingLeave(true);
    setError(null);
    try {
      await staffApi.applyForLeave({ leaveType, fromDate, toDate, reason: reason.trim(), document });
      setReason("");
      setDocument(null);
      refreshLeaveHistory();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmittingLeave(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await staffApi.cancelLeaveRequest(cancelTarget.id);
      refreshLeaveHistory();
      setCancelTarget(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  async function handleReportSkip() {
    if (!skipSubjectId || !skipReason.trim()) return;
    setSubmittingSkip(true);
    setError(null);
    try {
      const subject = subjects.find((s) => s.id === skipSubjectId);
      const substitute = teachers.find((t) => String(t.id) === substituteId);
      await staffApi.reportSkippedClass({
        subjectId: skipSubjectId,
        date: skipDate,
        period: skipPeriod,
        reason: skipReason.trim(),
        substituteTeacherId: substituteId ? Number(substituteId) : undefined,
      });
      setSkippedClasses((prev) => [
        { subjectName: subject?.name ?? "Subject", date: skipDate, period: skipPeriod, reason: skipReason.trim(), substituteTeacherName: substitute?.name ?? null },
        ...prev,
      ]);
      setSkipReason("");
      setSubstituteId("");
      setSkipSaved(true);
      setTimeout(() => setSkipSaved(false), 2500);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmittingSkip(false);
    }
  }

  return (
    <div>
      <PageHeader title="My Attendance & Leave" description="Your daily status, leave balance, and skipped-class reports." />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {/* HERO: Today's Status */}
      <Card>
        <CardBody className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/[0.06] via-transparent to-teal-500/[0.05]" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Today</p>
            <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">{formatDate(today())}</p>

            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              {myToday?.status ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-base font-extrabold text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                  <span className="h-2 w-2 rounded-full bg-current" /> {STATUS_LABEL[myToday.status]}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-base font-extrabold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
                  Not marked yet
                </span>
              )}
              {myToday?.markedAt && myToday.method && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Marked at <strong className="text-slate-700 dark:text-slate-200">{formatTime(myToday.markedAt)}</strong> via{" "}
                  <strong className="text-slate-700 dark:text-slate-200">{METHOD_LABEL[myToday.method]}</strong>
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                onClick={() => setScanMode(faceStatus?.enrolled ? "verify" : "enroll")}
                className="shadow-glow-brand"
              >
                <CameraIcon className="h-5 w-5" />
                {faceStatus?.enrolled ? "Scan Face to Mark Attendance" : "Enroll Your Face to Get Started"}
              </Button>
              <button
                onClick={() => setShowManual((v) => !v)}
                className="text-xs font-semibold text-slate-500 underline decoration-dotted underline-offset-4 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Mark manually instead
              </button>
              {faceStatus?.enrolled && (
                <button
                  onClick={() => setScanMode("enroll")}
                  className="text-xs font-semibold text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  Re-enroll face
                </button>
              )}
            </div>

            {showManual && (
              <div className="mt-4 border-t border-dashed border-slate-200 pt-4 dark:border-white/10">
                <SegmentedControl options={STATUS_OPTIONS} value={myToday?.status ?? null} onChange={handleManualStatusChange} disabled={savingStatus} />
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  ⚠️ Manual entries are timestamped and visible to your Principal.
                </p>
              </div>
            )}

            {leaveBalance && (
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                {leaveBalance.balances.map((b) => (
                  <div key={b.leaveType} className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {LEAVE_TYPES.find((t) => t.value === b.leaveType)?.label ?? b.leaveType}
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
                      {b.remaining} <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/ {b.entitlement} left</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* TWO COLUMN: Apply for Leave | Report Skipped Class */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Apply for Leave</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Leave Type">
                <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="hidden sm:block" />
              <Field label="From">
                <TextInput type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </Field>
              <Field label="To">
                <TextInput type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Required — describe the reason"
                className="block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/25"
              />
            </Field>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:border-brand-400/60 dark:hover:text-brand-300">
              <PaperClipIcon className="h-4 w-4" />
              {document ? document.name : "Attach supporting document (optional)"}
              <input type="file" className="hidden" onChange={(e) => setDocument(e.target.files?.[0] ?? null)} />
            </label>
            <Button onClick={handleApplyLeave} loading={submittingLeave} disabled={!reason.trim()} className="w-full justify-center">
              Submit Leave Request
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Report a Skipped Class</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <Select value={skipSubjectId ?? ""} onChange={(e) => setSkipSubjectId(Number(e.target.value))}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.classSectionName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Period">
                <Select value={skipPeriod} onChange={(e) => setSkipPeriod(Number(e.target.value))}>
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Date">
              <TextInput type="date" value={skipDate} onChange={(e) => setSkipDate(e.target.value)} />
            </Field>
            <Field label="Reason">
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                rows={2}
                placeholder="Required — e.g. emergency staff meeting"
                className="block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/25"
              />
            </Field>
            <Field label="Substitute Teacher" hint="Optional">
              <Select value={substituteId} onChange={(e) => setSubstituteId(e.target.value)}>
                <option value="">— None assigned —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleReportSkip} loading={submittingSkip} disabled={!skipSubjectId || !skipReason.trim()} className="flex-1 justify-center">
                Submit &amp; Notify Principal
              </Button>
              {skipSaved && <span className="shrink-0 text-xs font-semibold text-teal-600 dark:text-teal-400">✓ Reported</span>}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* HISTORY TABS */}
      <Card>
        <div className="flex gap-1 border-b border-slate-100 px-4 dark:border-white/10">
          <button
            onClick={() => setHistoryTab("leave")}
            className={clsx(
              "-mb-px border-b-2 px-3 py-3 text-xs font-bold transition-colors",
              historyTab === "leave" ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400" : "border-transparent text-slate-500 dark:text-slate-400"
            )}
          >
            Leave History
          </button>
          <button
            onClick={() => setHistoryTab("skip")}
            className={clsx(
              "-mb-px border-b-2 px-3 py-3 text-xs font-bold transition-colors",
              historyTab === "skip" ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400" : "border-transparent text-slate-500 dark:text-slate-400"
            )}
          >
            Skipped Classes
          </button>
        </div>
        <CardBody>
          {historyTab === "leave" ? (
            leaveHistory.length === 0 ? (
              <p className="py-4 text-sm text-slate-400 dark:text-slate-500">No leave requests yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                {leaveHistory.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {LEAVE_TYPES.find((t) => t.value === l.leaveType)?.label ?? l.leaveType}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(l.fromDate)}
                        {l.toDate !== l.fromDate ? ` – ${formatDate(l.toDate)}` : ""} · {l.reason}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${LEAVE_STATUS_BADGE[l.status]}`}>
                        {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                      </span>
                      {l.status === "PENDING" && (
                        <button
                          onClick={() => setCancelTarget(l)}
                          className="text-[11px] font-semibold text-coral-600 hover:underline dark:text-coral-400"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : skippedClasses.length === 0 ? (
            <p className="py-4 text-sm text-slate-400 dark:text-slate-500">No skipped-class reports yet this session.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
              {skippedClasses.map((s, i) => (
                <div key={i} className="py-2.5">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {s.subjectName} {s.period ? `· Period ${s.period}` : ""} · {formatDate(s.date)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Reason: {s.reason} · Substitute: {s.substituteTeacherName ?? "None"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {scanMode && (
        <FaceScanModal
          mode={scanMode}
          onClose={handleScanClosed}
          onEnrolled={handleScanClosed}
          onVerified={handleScanClosed}
        />
      )}

      <ConfirmModal
        open={cancelTarget !== null}
        title="Cancel leave request?"
        message={
          <>
            Withdraw your {cancelTarget && LEAVE_TYPES.find((t) => t.value === cancelTarget.leaveType)?.label.toLowerCase()} request for{" "}
            {cancelTarget && formatDate(cancelTarget.fromDate)}?
          </>
        }
        confirmLabel="Cancel Request"
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
