import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Field, Select } from "../../components/FormFields";
import { DatePicker } from "../../components/DatePicker";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import * as diaryApi from "../../api/diary";
import { listClassSections } from "../../api/classSections";
import { errorMessage } from "../../api/client";
import { formatDate } from "../../utils/date";
import { downloadBlob, isoDate } from "../../lib/download";
import type { ClassSectionSummary } from "../../types/roster";
import type { DiarySubjectRow } from "../../types/diary";

function submittedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DiaryOverviewPage() {
  const [classSections, setClassSections] = useState<ClassSectionSummary[]>([]);
  const [classSectionId, setClassSectionId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [teacherFilter, setTeacherFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [rows, setRows] = useState<DiarySubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DiarySubjectRow | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    listClassSections()
      .then((cs) => {
        setClassSections(cs);
        if (cs.length > 0) {
          setClassSectionId(cs[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        setError(errorMessage(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!classSectionId) return;
    setLoading(true);
    diaryApi
      .listDiaryForClassSection(classSectionId, date)
      .then(setRows)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [classSectionId, date]);

  const teacherNames = [...new Set(rows.map((r) => r.teacherName))];
  const filtered = rows.filter(
    (r) => (!teacherFilter || r.teacherName === teacherFilter) && (!subjectFilter || r.subjectName === subjectFilter)
  );
  const notSubmitted = rows.filter((r) => !r.entry || r.entry.status !== "SUBMITTED");
  const submittedCount = rows.length - notSubmitted.length;
  const className = classSections.find((c) => c.id === classSectionId)?.name ?? "";

  if (!loading && classSections.length === 0) {
    return (
      <div>
        <PageHeader title="Class Diary Overview" description="See what's been assigned across every subject, for any class." />
        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}
        <EmptyState
          title="No classes yet"
          description="Create a class section first, from Class Attendance → Manage Classes, then diary entries will show up here."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Class Diary Overview"
        description="See what's been assigned across every subject, for any class."
        actions={
          <div className="flex items-center gap-2">
            {!loading && rows.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {submittedCount} submitted
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-1 text-coral-700 dark:bg-coral-500/10 dark:text-coral-300">
                  {notSubmitted.length} pending
                </span>
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)} disabled={!classSectionId}>
              <ArrowDownTrayIcon className="h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Date">
            <DatePicker value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </Field>
          <ClassSectionPicker
            classSections={classSections}
            value={classSectionId}
            onChange={setClassSectionId}
            containerClassName="flex flex-wrap items-end gap-3"
          />
          <Field label="Teacher">
            <Select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="w-44">
              <option value="">All Teachers</option>
              {teacherNames.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-44">
              <option value="">All Subjects</option>
              {[...new Set(rows.map((r) => r.subjectName))].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {!loading && notSubmitted.length > 0 && (
        <div className="mb-4">
          <Alert type="warning">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {notSubmitted.length} of {rows.length} teachers haven't submitted today's diary for {className}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/80">
              {notSubmitted.map((r) => `${r.teacherName} (${r.subjectName})`).join(", ")}
            </p>
          </Alert>
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {className} — {formatDate(date)}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} subjects</span>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No subjects match" description="Try a different class, date, or filter." />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
              {filtered.map((r) => {
                const isSubmitted = r.entry?.status === "SUBMITTED";
                const isDraft = r.entry && r.entry.status !== "SUBMITTED";
                const clickable = !!r.entry;
                return (
                  <div
                    key={r.subjectId}
                    onClick={() => clickable && setViewing(r)}
                    className={clsx(
                      "flex flex-wrap items-center justify-between gap-3 rounded-lg py-3 pl-3 pr-2 transition-colors",
                      !isSubmitted && "opacity-80",
                      clickable ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" : "cursor-default"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                        {r.teacherName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.subjectName}</strong>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{r.teacherName}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-slate-500 dark:text-slate-400">
                          {r.entry ? r.entry.content : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                          ✓ Submitted
                        </span>
                      ) : isDraft ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-0.5 text-[11px] font-semibold text-coral-700 ring-1 ring-inset ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20">
                          Not submitted
                        </span>
                      )}
                      {r.entry && <span className="text-[11px] text-slate-400 dark:text-slate-500">at {submittedTime(r.entry.updatedAt)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {viewing?.entry && (
        <Modal open onClose={() => setViewing(null)} title={`${viewing.subjectName} — ${viewing.teacherName}`} widthClass="max-w-lg">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatDate(viewing.entry.date)}</span>
              {viewing.entry.pageNumber && <span>· Page {viewing.entry.pageNumber}</span>}
              {viewing.entry.dueDate && <span>· Due {formatDate(viewing.entry.dueDate)}</span>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{viewing.entry.content}</p>
            </div>
            {viewing.entry.hasAttachment && viewing.entry.attachmentFilename && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => diaryApi.downloadDiaryAttachment(viewing.entry!.id, viewing.entry!.attachmentFilename!)}
              >
                <ArrowDownTrayIcon className="h-4 w-4" /> {viewing.entry.attachmentFilename}
              </Button>
            )}
            {!viewing.entry.hasAttachment && (
              <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <DocumentTextIcon className="h-4 w-4" /> No attachment
              </p>
            )}
          </div>
        </Modal>
      )}

      {exportOpen && classSectionId && (
        <DiaryExportModal classSectionId={classSectionId} className={className} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}

function DiaryExportModal({ classSectionId, className, onClose }: { classSectionId: number; className: string; onClose: () => void }) {
  const now = new Date();
  const [from, setFrom] = useState(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(isoDate(now));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setDownloading(true);
    setError(null);
    try {
      const blob = await diaryApi.exportDiaryXlsx(classSectionId, from, to);
      downloadBlob(blob, `diary-${className.replace(/\s+/g, "-")}-${from}-to-${to}.xlsx`);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Export Diary — ${className}`} widthClass="max-w-sm">
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
        <Button className="w-full justify-center" variant="secondary" onClick={handleExport} loading={downloading}>
          <ArrowDownTrayIcon className="h-4 w-4" /> Export Diary (.xlsx)
        </Button>
      </div>
    </Modal>
  );
}
