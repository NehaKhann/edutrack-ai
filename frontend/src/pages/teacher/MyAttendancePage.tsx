import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { CameraIcon, FingerPrintIcon, ExclamationTriangleIcon as ExclamationTriangleOutline } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/solid";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { Modal } from "../../components/Modal";
import { Field, Select } from "../../components/FormFields";
import { DatePicker } from "../../components/DatePicker";
import { FaceScanModal } from "../../components/FaceScanModal";
import { FingerprintScanModal } from "../../components/FingerprintScanModal";
import { SegmentedControl, type SegmentedOption } from "../../components/SegmentedControl";
import * as staffApi from "../../api/staffAttendance";
import * as faceApi from "../../api/faceRecognition";
import { errorMessage } from "../../api/client";
import type { FaceStatus } from "../../types/face";
import type {
  AttendanceCorrectionRequest,
  AttendancePolicy,
  MyAttendanceSummary,
  MyTodayStatus,
  TeacherAttendanceStatus,
} from "../../types/staffAttendance";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatFullDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "09:00:00" -> "9:00 AM" */
function formatTimeOfDay(hms: string): string {
  const [h, m] = hms.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STATUS_OPTIONS: SegmentedOption<TeacherAttendanceStatus>[] = [
  { value: "PRESENT", label: "Present", activeClass: "bg-teal-500 text-white" },
  { value: "ABSENT", label: "Absent", activeClass: "bg-coral-500 text-white" },
  { value: "ON_LEAVE", label: "On Leave", activeClass: "bg-brand-500 text-white" },
  { value: "LATE", label: "Late", activeClass: "bg-amber-500 text-white" },
  { value: "HALF_DAY", label: "Half Day", activeClass: "bg-navy-500 text-white" },
];

const STATUS_META: Record<TeacherAttendanceStatus, { label: string; badge: string; icon: typeof CheckCircleIcon }> = {
  PRESENT: {
    label: "Present",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/25",
    icon: CheckCircleIcon,
  },
  ABSENT: {
    label: "Absent",
    badge: "bg-coral-50 text-coral-700 ring-coral-200 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/25",
    icon: XCircleIcon,
  },
  ON_LEAVE: {
    label: "On Leave",
    badge: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/25",
    icon: CalendarDaysIcon,
  },
  LATE: {
    label: "Late",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25",
    icon: ClockIcon,
  },
  HALF_DAY: {
    label: "Half Day",
    badge: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/[0.08] dark:text-slate-300 dark:ring-white/10",
    icon: ClockIcon,
  },
};

const METHOD_LABEL: Record<string, string> = {
  MANUAL: "Manual entry",
  FACE_RECOGNITION: "Face Recognition",
  FINGERPRINT: "Fingerprint",
  AUTO: "Auto-marked",
  PRINCIPAL_OVERRIDE: "Corrected by Principal",
};

const WEEK_ORDER: TeacherAttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "ON_LEAVE", "HALF_DAY"];

function weekSummaryText(summary: MyAttendanceSummary): string {
  const counts: Record<TeacherAttendanceStatus, number> = {
    PRESENT: summary.weekPresent,
    ABSENT: summary.weekAbsent,
    LATE: summary.weekLate,
    ON_LEAVE: summary.weekOnLeave,
    HALF_DAY: summary.weekHalfDay,
  };
  const parts = WEEK_ORDER.filter((s) => counts[s] > 0).map((s) => `${counts[s]} ${STATUS_META[s].label}`);
  return parts.length > 0 ? parts.join(" · ") : "No attendance marked yet";
}

// Fingerprint attendance is only offered inside the installed Android app (native BiometricPrompt) —
// the web version stays face-recognition-only, per the confirmed product decision.
const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export function MyAttendancePage() {
  const [error, setError] = useState<string | null>(null);
  const [myToday, setMyToday] = useState<MyTodayStatus | null>(null);
  const [summary, setSummary] = useState<MyAttendanceSummary | null>(null);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus | null>(null);
  const [scanMode, setScanMode] = useState<"enroll" | "verify" | null>(null);
  const [fingerprintOpen, setFingerprintOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [myRequests, setMyRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  useEffect(() => {
    refreshToday();
    refreshSummary();
    refreshRequests();
    faceApi.getFaceStatus().then(setFaceStatus).catch((e) => setError(errorMessage(e)));
    staffApi.getAttendancePolicy().then(setPolicy).catch(() => {});
  }, []);

  function refreshToday() {
    staffApi.getMyTodayStatus().then(setMyToday).catch((e) => setError(errorMessage(e)));
  }

  function refreshSummary() {
    staffApi.getMyAttendanceSummary().then(setSummary).catch(() => {});
  }

  function refreshRequests() {
    staffApi.listMyCorrectionRequests().then(setMyRequests).catch(() => {});
  }

  async function handleManualStatusChange(status: TeacherAttendanceStatus) {
    setSavingStatus(true);
    try {
      await staffApi.setMyTeacherStatus(status);
      refreshToday();
      refreshSummary();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingStatus(false);
    }
  }

  function handleScanClosed() {
    setScanMode(null);
    refreshToday();
    refreshSummary();
    faceApi.getFaceStatus().then(setFaceStatus).catch(() => {});
  }

  const alreadyMarked = Boolean(myToday?.status);
  const meta = myToday?.status ? STATUS_META[myToday.status] : null;
  const StatusIcon = meta?.icon ?? CheckCircleIcon;
  const pendingRequest = myRequests.find((r) => r.status === "PENDING") ?? null;

  return (
    <div>
      <PageHeader title="My Attendance" description="Mark your attendance for today." />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <Card>
        <CardBody className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/[0.06] via-transparent to-teal-500/[0.05]" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Today</p>
            <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">{formatFullDate(today())}</p>

            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              {meta ? (
                <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-lg font-extrabold ring-1 ring-inset ${meta.badge}`}>
                  <StatusIcon className="h-6 w-6" /> {meta.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-base font-extrabold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
                  Not marked yet
                </span>
              )}
              {myToday?.markedAt && myToday.method && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Marked at {formatTime(myToday.markedAt)} via {METHOD_LABEL[myToday.method]}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {faceStatus?.status === "PENDING" ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                  <ClockIcon className="h-5 w-5 shrink-0" />
                  Face enrollment submitted — waiting for your Principal's approval.
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setScanMode(faceStatus?.status === "APPROVED" ? "verify" : "enroll")}
                  className="shadow-glow-brand"
                  disabled={alreadyMarked && faceStatus?.status === "APPROVED"}
                  title={alreadyMarked && faceStatus?.status === "APPROVED" ? "Already marked for today — use Mark manually to change it" : undefined}
                >
                  <CameraIcon className="h-5 w-5" />
                  {faceStatus?.status === "APPROVED"
                    ? "Scan Face to Mark Attendance"
                    : faceStatus?.status === "REJECTED"
                      ? "Re-enroll Your Face"
                      : "Enroll Your Face to Get Started"}
                </Button>
              )}

              {isNativeAndroid && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setFingerprintOpen(true)}
                  disabled={alreadyMarked}
                  title={alreadyMarked ? "Already marked for today — use Mark manually to change it" : undefined}
                >
                  <FingerPrintIcon className="h-5 w-5" />
                  Scan Fingerprint
                </Button>
              )}
            </div>

            {faceStatus?.status === "REJECTED" && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-coral-600 dark:text-coral-400">
                <ExclamationTriangleOutline className="h-4 w-4 shrink-0" />
                Your last face enrollment was rejected{faceStatus.rejectionReason ? `: ${faceStatus.rejectionReason}` : "."}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowManual((v) => !v)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
              >
                Mark manually instead
              </button>
              {faceStatus?.status === "APPROVED" && (
                <button
                  onClick={() => setScanMode("enroll")}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:border-white/10 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
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

            {policy && (
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                Mark before {formatTimeOfDay(policy.cutoffTime)} to be Present — after that counts as Late. Not marked by{" "}
                {formatTimeOfDay(policy.autoAbsentTime)} counts as Absent without leave. You get one mark per day.
              </p>
            )}

            {pendingRequest ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                <ClockIcon className="h-4 w-4 shrink-0" />
                Correction requested for {formatFullDate(pendingRequest.attendanceDate)} — pending your Principal's review.
              </div>
            ) : (
              <button
                onClick={() => setCorrectionModalOpen(true)}
                className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
              >
                Something wrong? Request a correction
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {summary && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">This Week</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{weekSummaryText(summary)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Monthly Attendance</p>
            <p className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{summary.monthAttendancePercent}%</p>
          </div>
        </div>
      )}

      {scanMode && <FaceScanModal mode={scanMode} onClose={handleScanClosed} onEnrolled={handleScanClosed} onVerified={handleScanClosed} />}

      {fingerprintOpen && (
        <FingerprintScanModal
          onClose={() => {
            setFingerprintOpen(false);
            refreshToday();
            refreshSummary();
          }}
          onMarked={() => {
            refreshToday();
            refreshSummary();
          }}
        />
      )}

      {correctionModalOpen && (
        <CorrectionRequestModal
          currentStatus={myToday?.status ?? null}
          onClose={() => setCorrectionModalOpen(false)}
          onSubmitted={() => {
            setCorrectionModalOpen(false);
            refreshRequests();
          }}
        />
      )}
    </div>
  );
}

function CorrectionRequestModal({
  currentStatus,
  onClose,
  onSubmitted,
}: {
  currentStatus: TeacherAttendanceStatus | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [date, setDate] = useState(today());
  const [requestedStatus, setRequestedStatus] = useState<TeacherAttendanceStatus | "">(currentStatus ?? "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await staffApi.submitCorrectionRequest({
        attendanceDate: date,
        requestedStatus: requestedStatus || undefined,
        reason: reason.trim(),
      });
      onSubmitted();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Request an attendance correction" widthClass="max-w-md">
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <div className="space-y-3">
        <Field label="Date" hint="You can request a correction for any day in the last 30 days.">
          <DatePicker value={date} onChange={(e) => setDate(e.target.value)} minDate={daysAgo(30)} maxDate={today()} />
        </Field>
        <Field label="What should it be?" hint="Optional — leave blank to just explain what happened.">
          <Select value={requestedStatus} onChange={(e) => setRequestedStatus(e.target.value as TeacherAttendanceStatus | "")}>
            <option value="">No specific status</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. I arrived at 8:45 but the app marked me absent"
            className="block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/25"
          />
        </Field>
        <Button onClick={handleSubmit} loading={submitting} disabled={!reason.trim()} className="w-full justify-center">
          Send to Principal
        </Button>
      </div>
    </Modal>
  );
}
