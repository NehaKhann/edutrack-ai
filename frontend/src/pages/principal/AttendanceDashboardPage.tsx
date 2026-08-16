import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon, UsersIcon, Squares2X2Icon, ArrowUpTrayIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput, Select } from "../../components/FormFields";
import { DatePicker } from "../../components/DatePicker";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { Modal } from "../../components/Modal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { StatCard } from "../../components/StatCard";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import { PercentBarChart, StatusDonutChart, TrendLineChart } from "../../components/Charts";
import * as attendanceApi from "../../api/attendance";
import * as studentsApi from "../../api/students";
import * as classSectionsApi from "../../api/classSections";
import { listClassSections } from "../../api/classSections";
import { errorMessage } from "../../api/client";
import { formatDate } from "../../utils/date";
import { downloadBlob } from "../../lib/download";
import type { ClassSectionSummary, Student, StudentImportResult } from "../../types/roster";
import type { ClassAttendanceSummary, StudentAttendanceRow } from "../../types/attendance";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceDashboardPage() {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<ClassAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyNotMarked, setOnlyNotMarked] = useState(false);
  const [lowAttendance, setLowAttendance] = useState(false);
  const [detailFor, setDetailFor] = useState<ClassAttendanceSummary | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [classesModalOpen, setClassesModalOpen] = useState(false);

  const [trend, setTrend] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    setLoading(true);
    attendanceApi
      .getAttendanceSummary(date)
      .then(setSummary)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    Promise.all(days.map((d) => attendanceApi.getAttendanceSummary(d).catch(() => [] as ClassAttendanceSummary[]))).then((results) => {
      setTrend(
        results.map((rows, i) => {
          const total = rows.reduce((sum, r) => sum + r.total, 0);
          const present = rows.reduce((sum, r) => sum + r.present, 0);
          const pct = total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
          return { label: new Date(days[i]).toLocaleDateString(undefined, { weekday: "short" }), value: pct };
        })
      );
    });
  }, []);

  const totalClasses = summary.length;
  const completed = summary.filter((s) => s.completed).length;
  const notMarked = totalClasses - completed;
  const totalStudents = summary.reduce((sum, s) => sum + s.total, 0);
  const totalPresent = summary.reduce((sum, s) => sum + s.present, 0);
  const overallPct = totalStudents === 0 ? 0 : Math.round((totalPresent / totalStudents) * 1000) / 10;

  const filtered = summary.filter((s) => {
    if (onlyNotMarked && s.completed) return false;
    if (lowAttendance && (!s.completed || s.attendancePercent >= 90)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Attendance Dashboard"
        description="Today's attendance completion across every class."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setClassesModalOpen(true)}>
              <Squares2X2Icon className="h-4 w-4" /> Manage Classes
            </Button>
            <Button variant="secondary" onClick={() => setRosterOpen(true)}>
              <UsersIcon className="h-4 w-4" /> Manage Roster
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
        <StatCard icon="📚" label="Total Classes" value={totalClasses} />
        <StatCard icon="✅" label="Overall Attendance" value={`${overallPct}%`} tone="teal" />
        <StatCard icon="☑️" label="Completed" value={completed} tone="teal" />
        <StatCard icon="⚠️" label="Not Marked" value={notMarked} tone="coral" />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Date">
            <DatePicker value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </Field>
        </CardBody>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Attendance % by Class</h3>
          </CardHeader>
          <CardBody>
            <PercentBarChart
              data={summary.filter((s) => s.completed).map((s) => ({ name: s.classSectionName, value: s.attendancePercent }))}
              valueLabel="Attendance"
              emptyMessage="No classes marked yet for this date."
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Present / Absent / Late — {formatDate(date)}</h3>
          </CardHeader>
          <CardBody>
            <StatusDonutChart
              present={summary.reduce((sum, s) => sum + s.present, 0)}
              absent={summary.reduce((sum, s) => sum + s.absent, 0)}
              late={summary.reduce((sum, s) => sum + s.late, 0)}
              emptyMessage="No attendance marked yet for this date."
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Last 7 Days — Attendance Trend</h3>
        </CardHeader>
        <CardBody>
          <TrendLineChart data={trend} emptyMessage="Not enough attendance history yet." />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            All Classes — {formatDate(date)}
            {!loading && (onlyNotMarked || lowAttendance) && (
              <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                ({filtered.length} of {totalClasses})
              </span>
            )}
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOnlyNotMarked((v) => !v)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                onlyNotMarked
                  ? "border-transparent bg-brand-600 text-white"
                  : "border-slate-300 bg-white/80 text-slate-600 hover:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
              )}
            >
              Only not marked
            </button>
            <button
              onClick={() => setLowAttendance((v) => !v)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                lowAttendance
                  ? "border-transparent bg-brand-600 text-white"
                  : "border-slate-300 bg-white/80 text-slate-600 hover:border-brand-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-300"
              )}
            >
              Low attendance (&lt;90%)
            </button>
          </div>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No classes match" description="Try a different date or filter." />
          </div>
        ) : (
          <ResponsiveTable>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Present</th>
                  <th className="px-5 py-3">Absent</th>
                  <th className="px-5 py-3">Late</th>
                  <th className="px-5 py-3">Attendance %</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                {filtered.map((s) => (
                  <tr
                    key={s.classSectionId}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => setDetailFor(s)}
                  >
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{s.classSectionName}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">{s.total}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">{s.completed ? s.present : "—"}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">{s.completed ? s.absent : "—"}</td>
                    <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">{s.completed ? s.late : "—"}</td>
                    <td
                      className={clsx(
                        "px-5 py-3 tabular-nums",
                        !s.completed ? "text-slate-400 dark:text-slate-500" : s.attendancePercent < 90 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"
                      )}
                    >
                      {s.completed ? `${s.attendancePercent}%` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {s.completed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-0.5 text-[11px] font-semibold text-coral-700 ring-1 ring-inset ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20">
                          Not marked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </Card>

      {detailFor && <AttendanceDetailModal summary={detailFor} date={date} onClose={() => setDetailFor(null)} />}
      {rosterOpen && <RosterModal onClose={() => setRosterOpen(false)} />}
      {classesModalOpen && <ManageClassesModal onClose={() => setClassesModalOpen(false)} />}
    </div>
  );
}

function AttendanceDetailModal({
  summary,
  date,
  onClose,
}: {
  summary: ClassAttendanceSummary;
  date: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    attendanceApi
      .getAttendanceDetail(summary.classSectionId, date)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [summary.classSectionId, date]);

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const statusBadge = (status: StudentAttendanceRow["status"]) => {
    if (!status) return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">Unmarked</span>;
    const map: Record<string, string> = {
      PRESENT: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
      ABSENT: "bg-coral-50 text-coral-700 ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20",
      LATE: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
      LEAVE: "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20",
    };
    return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", map[status])}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
  };

  return (
    <Modal open onClose={onClose} title={`${summary.classSectionName} — Attendance`} widthClass="max-w-lg">
      <p className="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(date)}</p>
      <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-semibold">
        <span className="text-teal-600 dark:text-teal-400">Present {summary.present}</span>
        <span className="text-coral-600 dark:text-coral-400">Absent {summary.absent}</span>
        <span className="text-amber-600 dark:text-amber-400">Late {summary.late}</span>
        <span className="text-brand-600 dark:text-brand-400">Leave {summary.leave}</span>
      </div>
      <TextInput placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-white/[0.08]">
          {filtered.map((r) => (
            <div key={r.studentId} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Roll No. {r.rollNumber}</p>
              </div>
              {statusBadge(r.status)}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function RosterModal({ onClose }: { onClose: () => void }) {
  const [classSections, setClassSections] = useState<ClassSectionSummary[]>([]);
  const [classSectionId, setClassSectionId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    listClassSections()
      .then((cs) => {
        setClassSections(cs);
        if (cs.length > 0) setClassSectionId(cs[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  function refreshStudents() {
    if (!classSectionId) return;
    setLoading(true);
    studentsApi
      .listStudents(classSectionId)
      .then(setStudents)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(refreshStudents, [classSectionId]);

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
      <div className="flex items-end justify-between gap-3">
        <div className="flex-1">
          <ClassSectionPicker classSections={classSections} value={classSectionId} onChange={setClassSectionId} />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
          <ArrowUpTrayIcon className="h-4 w-4" /> Import
        </Button>
      </div>

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
            Remove <strong>{deleteTarget?.name}</strong> from the roster? Their past attendance history is kept, but they won't appear in future attendance lists.
          </>
        }
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {importOpen && (
        <ImportStudentsModal
          onClose={() => setImportOpen(false)}
          onImported={refreshStudents}
        />
      )}
    </Modal>
  );
}

function ImportStudentsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const blob = await studentsApi.downloadStudentImportTemplate();
      downloadBlob(blob, "student-import-template.xlsx");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const res = await studentsApi.importStudents(file);
      setResult(res);
      onImported();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Import Students" widthClass="max-w-lg">
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        {!result ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload an .xlsx file with one student per row (Class, Section, Roll Number, Name). The class and section must already
              exist. Download the template below to see the expected columns.
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> Download template
            </button>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-white/10 dark:file:text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} loading={importing} disabled={!file}>
                <ArrowUpTrayIcon className="h-4 w-4" /> Import
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert type={result.created > 0 ? "success" : "warning"}>
              {result.created} student{result.created === 1 ? "" : "s"} added
              {result.skipped.length > 0 ? `, ${result.skipped.length} row${result.skipped.length === 1 ? "" : "s"} skipped` : ""}.
            </Alert>

            {result.skipped.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Row</th>
                      <th className="px-4 py-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                    {result.skipped.map((s) => (
                      <tr key={s.row}>
                        <td className="px-4 py-2.5">{s.row}</td>
                        <td className="px-4 py-2.5 text-coral-600 dark:text-coral-400">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ManageClassesModal({ onClose }: { onClose: () => void }) {
  const [classSections, setClassSections] = useState<ClassSectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newClassName, setNewClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);

  const [sectionClassName, setSectionClassName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    listClassSections()
      .then(setClassSections)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  const classNames = [...new Set(classSections.map((c) => c.className))].sort();
  const groups = new Map<string, ClassSectionSummary[]>();
  for (const cs of classSections) {
    const arr = groups.get(cs.className) ?? [];
    arr.push(cs);
    groups.set(cs.className, arr);
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) return;
    setCreatingClass(true);
    setError(null);
    try {
      await classSectionsApi.createClass(newClassName.trim());
      setNewClassName("");
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreatingClass(false);
    }
  }

  async function handleAddSection() {
    if (!sectionClassName || !newSectionName.trim()) return;
    setAddingSection(true);
    setError(null);
    try {
      await classSectionsApi.addSection(sectionClassName, newSectionName.trim());
      setNewSectionName("");
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAddingSection(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Manage Classes & Sections" widthClass="max-w-lg">
      <div className="space-y-5">
        {error && <Alert type="error">{error}</Alert>}

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Existing Classes</h4>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : groups.size === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No classes yet.</p>
          ) : (
            <div className="max-h-52 space-y-2 overflow-y-auto">
              {[...groups.entries()].map(([cn, sections]) => (
                <div key={cn} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{cn}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sections.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:ring-white/10"
                      >
                        {s.sectionName ?? "No section"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-white/10">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Add a New Class</h4>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Class name">
              <TextInput value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. Grade 8" />
            </Field>
            <Button size="sm" onClick={handleCreateClass} loading={creatingClass} disabled={!newClassName.trim()}>
              <PlusIcon className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Creates a class with no sections — fine if this class doesn't need any.</p>
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-white/10">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Add a Section to a Class</h4>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Class">
              <Select value={sectionClassName} onChange={(e) => setSectionClassName(e.target.value)} className="w-36">
                <option value="">Select...</option>
                {classNames.map((cn) => (
                  <option key={cn} value={cn}>
                    {cn}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section name">
              <TextInput value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="e.g. Violet" />
            </Field>
            <Button size="sm" onClick={handleAddSection} loading={addingSection} disabled={!sectionClassName || !newSectionName.trim()}>
              <PlusIcon className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Existing students, subjects, and timetable stay exactly where they are — a new section starts empty.
          </p>
        </div>
      </div>
    </Modal>
  );
}
