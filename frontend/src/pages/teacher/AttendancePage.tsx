import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircleIcon, UsersIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput, Select } from "../../components/FormFields";
import { DatePicker } from "../../components/DatePicker";
import { Alert } from "../../components/Alert";
import { SkeletonRows } from "../../components/Skeleton";
import { Toast } from "../../components/Toast";
import { SegmentedControl, type SegmentedOption } from "../../components/SegmentedControl";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import { Modal } from "../../components/Modal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Spinner } from "../../components/Spinner";
import { getMySubjects } from "../../api/subjects";
import * as attendanceApi from "../../api/attendance";
import * as studentsApi from "../../api/students";
import { errorMessage } from "../../api/client";
import type { Subject } from "../../types";
import type { ClassSectionSummary, Student } from "../../types/roster";
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

const STATUS_META: Record<StudentAttendanceStatus, { label: string; dot: string; text: string; ring: string }> = {
  PRESENT: {
    label: "Present",
    dot: "bg-teal-500",
    text: "text-teal-600 dark:text-teal-400",
    ring: "border-teal-300 bg-teal-50/70 dark:border-teal-500/40 dark:bg-teal-500/[0.08]",
  },
  ABSENT: {
    label: "Absent",
    dot: "bg-coral-500",
    text: "text-coral-600 dark:text-coral-400",
    ring: "border-coral-300 bg-coral-50/70 dark:border-coral-500/40 dark:bg-coral-500/[0.08]",
  },
  LATE: {
    label: "Late",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    ring: "border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/[0.08]",
  },
  LEAVE: {
    label: "Leave",
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    ring: "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-500/[0.08]",
  },
};

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
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterVersion, setRosterVersion] = useState(0);
  const [sortBy, setSortBy] = useState<"roll" | "name">("roll");
  const [statusFilter, setStatusFilter] = useState<StudentAttendanceStatus | null>(null);

  const classSections = useMemo(() => {
    const map = new Map<number, ClassSectionSummary>();
    subjects.forEach((s) =>
      map.set(s.classSectionId, { id: s.classSectionId, name: s.classSectionName, className: s.className, sectionName: s.sectionName })
    );
    return [...map.values()];
  }, [subjects]);

  const classSubjects = useMemo(() => subjects.filter((s) => s.classSectionId === classSectionId), [subjects, classSectionId]);

  const sortedRoster = useMemo(() => {
    const copy = [...roster];
    copy.sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
    );
    return copy;
  }, [roster, sortBy]);

  const visibleRoster = useMemo(() => {
    if (!statusFilter) return sortedRoster;
    return sortedRoster.filter((s) => marks[s.studentId] === statusFilter);
  }, [sortedRoster, marks, statusFilter]);

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
    setStatusFilter(null);
  }, [classSectionId, date, mode, subjectId, period, rosterVersion]);

  function markAllPresent() {
    const next: Record<number, StudentAttendanceStatus> = {};
    roster.forEach((s) => (next[s.studentId] = "PRESENT"));
    setMarks(next);
  }

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<StudentAttendanceStatus, number>;
  Object.values(marks).forEach((s) => (counts[s] += 1));
  const markedCount = Object.keys(marks).length;
  const presentPercent = markedCount > 0 ? Math.round((counts.PRESENT / markedCount) * 100) : 0;
  const attendancePercent = markedCount > 0 ? Math.round(((counts.PRESENT + counts.LATE) / markedCount) * 100) : 0;

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
      <PageHeader
        title="Mark Attendance"
        description="Take attendance for your class, daily or period-wise."
        actions={
          <Button variant="secondary" onClick={() => setRosterOpen(true)} disabled={classSections.length === 0}>
            <UsersIcon className="h-4 w-4" /> Manage Roster
          </Button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Date">
              <DatePicker value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
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
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{roster.length} students</h3>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="mt-0.5 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  Showing {STATUS_META[statusFilter].label.toLowerCase()} only — clear filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {roster.length > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/80 p-0.5 dark:border-white/15 dark:bg-white/5">
                  <span className="pl-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">Sort:</span>
                  <button
                    onClick={() => setSortBy("roll")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${sortBy === "roll" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    Roll No.
                  </button>
                  <button
                    onClick={() => setSortBy("name")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${sortBy === "name" ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    Name
                  </button>
                </div>
              )}
              <Button size="sm" onClick={markAllPresent} disabled={roster.length === 0}>
                <CheckCircleIcon className="h-4 w-4" /> Mark All Present
              </Button>
            </div>
          </div>

          {roster.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(STATUS_META) as StudentAttendanceStatus[]).map((status) => {
                  const meta = STATUS_META[status];
                  const active = statusFilter === status;
                  const count = counts[status];
                  return (
                    <button
                      key={status}
                      onClick={() => count > 0 && setStatusFilter((f) => (f === status ? null : status))}
                      disabled={count === 0}
                      title={count === 0 ? `No students marked ${meta.label.toLowerCase()}` : `Show only ${meta.label.toLowerCase()} students`}
                      className={clsx(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all",
                        active
                          ? clsx(meta.ring, "shadow-sm")
                          : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20",
                        count === 0 && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
                      <span className="flex items-baseline gap-1.5">
                        <span className={clsx("text-lg font-bold tabular-nums", meta.text)}>{count}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{meta.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {markedCount > 0 && (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                    <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${presentPercent}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {presentPercent}% present · {attendancePercent}% attendance (present + late)
                  </p>
                </div>
              )}
            </>
          )}
        </CardHeader>
        <CardBody>
          {loading ? (
            <SkeletonRows count={4} />
          ) : roster.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No students are on the roster for this class yet.</p>
              <Button size="sm" onClick={() => setRosterOpen(true)}>
                <PlusIcon className="h-4 w-4" /> Add students
              </Button>
            </div>
          ) : visibleRoster.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No {statusFilter && STATUS_META[statusFilter].label.toLowerCase()} students to show.
              </p>
              <button
                onClick={() => setStatusFilter(null)}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
              {visibleRoster.map((s) => (
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

      {rosterOpen && (
        <RosterModal
          classSections={classSections}
          initialClassSectionId={classSectionId}
          onClose={() => {
            setRosterOpen(false);
            setRosterVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function RosterModal({
  classSections,
  initialClassSectionId,
  onClose,
}: {
  classSections: ClassSectionSummary[];
  initialClassSectionId: number | null;
  onClose: () => void;
}) {
  const [classSectionId, setClassSectionId] = useState<number | null>(initialClassSectionId ?? classSections[0]?.id ?? null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!classSectionId) return;
    setLoading(true);
    studentsApi
      .listStudents(classSectionId)
      .then(setStudents)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [classSectionId]);

  async function handleAdd() {
    if (!classSectionId || !name.trim() || !rollNumber.trim()) return;
    setAdding(true);
    try {
      const created = await studentsApi.createStudent(classSectionId, name.trim(), rollNumber.trim());
      setStudents((prev) => [...prev, created].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })));
      setName("");
      setRollNumber("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await studentsApi.deactivateStudent(deleteTarget.id);
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Manage Student Roster" widthClass="max-w-lg">
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <ClassSectionPicker classSections={classSections} value={classSectionId} onChange={setClassSectionId} />

      <div className="mt-4 flex items-end gap-2">
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
        </Field>
        <Field label="Roll No.">
          <TextInput value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. 14" className="w-24" />
        </Field>
        <Button size="sm" onClick={handleAdd} loading={adding} disabled={!name.trim() || !rollNumber.trim()}>
          <PlusIcon className="h-4 w-4" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : students.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No students in this class yet.</p>
      ) : (
        <div className="mt-4 max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-white/[0.08]">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Roll No. {s.rollNumber}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(s)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-coral-50 hover:text-coral-600 dark:text-slate-500 dark:hover:bg-coral-500/15 dark:hover:text-coral-400"
                aria-label="Remove student"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Remove student?"
        message={
          <>
            Remove <strong>{deleteTarget?.name}</strong> from the roster? Their past attendance history is kept, but they won't appear
            in future attendance lists.
          </>
        }
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Modal>
  );
}
