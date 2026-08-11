import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput, Select } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { Spinner } from "../../components/Spinner";
import { SegmentedControl, type SegmentedOption } from "../../components/SegmentedControl";
import { getMySubjects } from "../../api/subjects";
import * as attendanceApi from "../../api/attendance";
import { errorMessage } from "../../api/client";
import type { Subject } from "../../types";
import type { StudentAttendanceStatus } from "../../types/attendance";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_OPTIONS: SegmentedOption<StudentAttendanceStatus>[] = [
  { value: "PRESENT", label: "P", activeClass: "bg-teal-500 text-white" },
  { value: "ABSENT", label: "A", activeClass: "bg-coral-500 text-white" },
  { value: "LATE", label: "L", activeClass: "bg-amber-500 text-white" },
  { value: "LEAVE", label: "Lv", activeClass: "bg-brand-500 text-white" },
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
  const [saved, setSaved] = useState(false);

  const classSections = useMemo(() => {
    const map = new Map<number, string>();
    subjects.forEach((s) => map.set(s.classSectionId, s.classSectionName));
    return [...map.entries()].map(([id, name]) => ({ id, name }));
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
    setSaved(false);
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
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mark Attendance" description="Take attendance for your class, daily or period-wise." />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </Field>
            <Field label="Class">
              <Select value={classSectionId ?? ""} onChange={(e) => setClassSectionId(Number(e.target.value))} className="w-40">
                {classSections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
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
            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
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
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{roster.length} students</h3>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-semibold">
              <span className="text-teal-600 dark:text-teal-400">Present {counts.PRESENT}</span>
              <span className="text-coral-600 dark:text-coral-400">Absent {counts.ABSENT}</span>
              <span className="text-amber-600 dark:text-amber-400">Late {counts.LATE}</span>
              <span className="text-brand-600 dark:text-brand-400">Leave {counts.LEAVE}</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={markAllPresent}>
            <CheckCircleIcon className="h-4 w-4" /> Mark All Present
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : roster.length === 0 ? (
            <p className="py-4 text-sm text-slate-400 dark:text-slate-500">
              No students are on the roster for this class yet — ask your Principal to add them.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
              {roster.map((s) => (
                <div key={s.studentId} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                    {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Roll No. {s.rollNumber}</p>
                  </div>
                  <SegmentedControl
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
            {saved && (
              <p className="mb-2 text-xs font-semibold text-teal-600 dark:text-teal-400">✓ Attendance saved.</p>
            )}
            <Button className="w-full justify-center" onClick={handleSubmit} loading={submitting}>
              Submit Attendance
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
