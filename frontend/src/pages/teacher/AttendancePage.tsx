import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput, Select } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { SkeletonRows } from "../../components/Skeleton";
import { Toast } from "../../components/Toast";
import { SegmentedControl, type SegmentedOption } from "../../components/SegmentedControl";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import { getMySubjects } from "../../api/subjects";
import * as attendanceApi from "../../api/attendance";
import { errorMessage } from "../../api/client";
import type { Subject } from "../../types";
import type { ClassSectionSummary } from "../../types/roster";
import type { StudentAttendanceStatus } from "../../types/attendance";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_OPTIONS: SegmentedOption<StudentAttendanceStatus>[] = [
  { value: "PRESENT", label: "P", activeClass: "bg-teal-500 text-white", activeGlowClass: "shadow-glow-teal" },
  { value: "ABSENT", label: "A", activeClass: "bg-coral-500 text-white", activeGlowClass: "shadow-glow-coral" },
  { value: "LATE", label: "L", activeClass: "bg-amber-500 text-white", activeGlowClass: "shadow-glow-amber" },
  { value: "LEAVE", label: "Lv", activeClass: "bg-blue-500 text-white", activeGlowClass: "shadow-[0_8px_24px_-6px_rgba(59,130,246,0.4)]" },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function AttendancePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSectionId, setClassSectionId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState<"daily" | "period">("daily");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [period, setPeriod] = useState(1);

  const [marks, setMarks] = useState<Record<number, StudentAttendanceStatus>>({});
  const [roster, setRoster] = useState<{ studentId: number; name: string; rollNumber: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const classSections = useMemo(() => {
    const map = new Map<number, ClassSectionSummary>();
    subjects.forEach((s) =>
      map.set(s.classSectionId, { id: s.classSectionId, name: s.classSectionName, className: s.className, sectionName: s.sectionName })
    );
    return [...map.values()];
  }, [subjects]);

  const classSubjects = useMemo(() => subjects.filter((s) => s.classSectionId === classSectionId), [subjects, classSectionId]);

  useEffect(() => {
    getMySubjects()
      .then((subs) => {
        setSubjects(subs);
        if (subs.length > 0) {
          setClassSectionId(subs[0].classSectionId);
          setSubjectId(subs[0].id);
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (!classSectionId) return;
    setLoading(true);
    attendanceApi
      .getAttendanceContext({
        classSectionId,
        date,
        subjectId: mode === "period" ? subjectId ?? undefined : undefined,
        period: mode === "period" ? period : undefined,
      })
      .then((rows) => {
        setRoster(rows.map((r) => ({ studentId: r.studentId, name: r.name, rollNumber: r.rollNumber })));
        const next: Record<number, StudentAttendanceStatus> = {};
        rows.forEach((r) => {
          if (r.status) next[r.studentId] = r.status;
        });
        setMarks(next);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [classSectionId, date, mode, subjectId, period]);

  function markAllPresent() {
    const next: Record<number, StudentAttendanceStatus> = {};
    roster.forEach((s) => (next[s.studentId] = "PRESENT"));
    setMarks(next);
  }

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<StudentAttendanceStatus, number>;
  Object.values(marks).forEach((s) => (counts[s] += 1));
  const markedCount = Object.keys(marks).length;
  const presentPercent = markedCount > 0 ? Math.round((counts.PRESENT / markedCount) * 100) : 0;

  async function handleSubmit() {
    if (!classSectionId) return;
    setSubmitting(true);
    setError(null);
    try {
      await attendanceApi.bulkMarkAttendance({
        classSectionId,
        date,
        subjectId: mode === "period" ? subjectId ?? undefined : undefined,
        period: mode === "period" ? period : undefined,
        marks: Object.entries(marks).map(([studentId, status]) => ({ studentId: Number(studentId), status })),
      });
      setToast("Attendance saved successfully.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mark Attendance" description="Take attendance for your class, daily or period-wise." />

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </Field>
            <ClassSectionPicker
              classSections={classSections}
              value={classSectionId}
              onChange={setClassSectionId}
              selectClassName="w-40"
              containerClassName="flex flex-wrap items-end gap-3"
            />
            <Field label="Mode">
              <div className="inline-flex rounded-lg border border-slate-300 bg-white/80 p-0.5 dark:border-white/15 dark:bg-white/5">
                <button
                  onClick={() => setMode("daily")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${mode === "daily" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setMode("period")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${mode === "period" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  Period-wise
                </button>
              </div>
            </Field>
          </div>

          {mode === "period" && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-500/20 dark:bg-brand-500/5">
              <Field label="Subject">
                <Select value={subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value))} className="w-48">
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Period">
                <Select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-32">
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{roster.length} students</h3>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-4">
              <span className="flex items-baseline gap-1 text-teal-600 dark:text-teal-400">
                <span className="text-lg font-bold tabular-nums">{counts.PRESENT}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide">Present</span>
              </span>
              <span className="flex items-baseline gap-1 text-coral-600 dark:text-coral-400">
                <span className="text-lg font-bold tabular-nums">{counts.ABSENT}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide">Absent</span>
              </span>
              <span className="flex items-baseline gap-1 text-amber-600 dark:text-amber-400">
                <span className="text-lg font-bold tabular-nums">{counts.LATE}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide">Late</span>
              </span>
              <span className="flex items-baseline gap-1 text-blue-600 dark:text-blue-400">
                <span className="text-lg font-bold tabular-nums">{counts.LEAVE}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide">Leave</span>
              </span>
              {markedCount > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                  {presentPercent}% present
                </span>
              )}
            </div>
          </div>
          <Button size="sm" onClick={markAllPresent} disabled={roster.length === 0}>
            <CheckCircleIcon className="h-4 w-4" /> Mark All Present
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <SkeletonRows count={4} />
          ) : roster.length === 0 ? (
            <p className="py-4 text-sm text-slate-400 dark:text-slate-500">
              No students are on the roster for this class yet — ask your Principal to add them.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
              {roster.map((s) => (
                <div
                  key={s.studentId}
                  className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                    {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Roll No. {s.rollNumber}</p>
                  </div>
                  <SegmentedControl
                    size="md"
                    options={STATUS_OPTIONS}
                    value={marks[s.studentId] ?? null}
                    onChange={(v) => setMarks((m) => ({ ...m, [s.studentId]: v }))}
                  />
                </div>
              ))}
            </div>
          )}
        </CardBody>
        {roster.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4 dark:border-white/10">
            <Button className="w-full justify-center" size="lg" onClick={handleSubmit} loading={submitting}>
              Submit Attendance
            </Button>
          </div>
        )}
      </Card>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
