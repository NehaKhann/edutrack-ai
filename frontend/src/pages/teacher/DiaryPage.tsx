import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { SubjectSelect } from "../../components/SubjectSelect";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput } from "../../components/FormFields";
import { DatePicker } from "../../components/DatePicker";
import { Alert } from "../../components/Alert";
import { Spinner } from "../../components/Spinner";
import { getMySubjects } from "../../api/subjects";
import * as diaryApi from "../../api/diary";
import { errorMessage } from "../../api/client";
import { isoDate } from "../../lib/download";
import type { Subject } from "../../types";
import type { DiaryEntry } from "../../types/diary";

function today(): string {
  return isoDate(new Date());
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const textareaBase =
  "block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/25";

export function DiaryPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [content, setContent] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const [todaysEntries, setTodaysEntries] = useState<DiaryEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    getMySubjects()
      .then((subs) => {
        setSubjects(subs);
        if (subs.length > 0) setSubjectId(subs[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    };
  }, []);

  function loadEntries() {
    setEntriesLoading(true);
    diaryApi
      .listMyDiaryEntries(date)
      .then(setTodaysEntries)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setEntriesLoading(false));
  }

  function flashSuccess(message: string) {
    setSuccessMessage(message);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = window.setTimeout(() => setSuccessMessage(null), 3500);
  }

  function resetForm() {
    setContent("");
    setPageNumber("");
    setDueDate("");
    setAttachment(null);
    setEditingEntryId(null);
  }

  async function handleSubmit(draft: boolean) {
    if (!subjectId || !content.trim()) return;
    draft ? setSavingDraft(true) : setSubmitting(true);
    setError(null);
    try {
      await diaryApi.upsertDiaryEntry({
        subjectId,
        date,
        content: content.trim(),
        pageNumber: pageNumber.trim() || undefined,
        dueDate: dueDate || undefined,
        attachment,
        draft,
      });
      resetForm();
      flashSuccess(draft ? "Saved as draft." : "Diary entry submitted.");
      loadEntries();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
      setSavingDraft(false);
    }
  }

  async function handleCopyFromYesterday() {
    if (!subjectId) return;
    setCopyingYesterday(true);
    setError(null);
    try {
      const entries = await diaryApi.listMyDiaryEntries(addDays(date, -1));
      const match = entries.find((e) => e.subjectId === subjectId);
      if (!match) {
        setError("No diary entry found for this subject on the previous day.");
        return;
      }
      setContent(match.content);
      setPageNumber(match.pageNumber ?? "");
      setDueDate(match.dueDate ?? "");
      flashSuccess("Copied yesterday's entry — review and submit.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCopyingYesterday(false);
    }
  }

  function startEdit(entry: DiaryEntry) {
    setSubjectId(entry.subjectId);
    setContent(entry.content);
    setPageNumber(entry.pageNumber ?? "");
    setDueDate(entry.dueDate ?? "");
    setAttachment(null);
    setEditingEntryId(entry.id);
    setError(null);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setAttachment(file);
  }

  const submittedSubjectIds = new Set(todaysEntries.filter((e) => e.status === "SUBMITTED").map((e) => e.subjectId));
  const missingSubjects = subjects.filter((s) => !submittedSubjectIds.has(s.id));
  const editingEntry = editingEntryId ? todaysEntries.find((e) => e.id === editingEntryId) ?? null : null;

  return (
    <div>
      <PageHeader title="Class Diary" description="Write today's homework and classroom notes for your students." />

      {error && (
        <div className="mb-4">
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {editingEntry ? `Editing — ${editingEntry.subjectName} (${editingEntry.classSectionName})` : "New Diary Entry"}
            </h3>
            <div className="flex items-center gap-3">
              {editingEntry && (
                <button
                  onClick={resetForm}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <XMarkIcon className="h-3.5 w-3.5" /> Cancel edit
                </button>
              )}
              <button
                onClick={handleCopyFromYesterday}
                disabled={!subjectId || copyingYesterday}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {copyingYesterday ? <Spinner className="h-3.5 w-3.5" /> : <DocumentDuplicateIcon className="h-3.5 w-3.5" />}
                Copy from yesterday
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3.5">
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Alert type="success">{successMessage}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Date">
                <DatePicker
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setEditingEntryId(null);
                  }}
                />
              </Field>
              <Field label="Class &amp; Subject">
                <SubjectSelect
                  subjects={subjects}
                  value={subjectId}
                  onChange={(id) => {
                    setSubjectId(id);
                    setEditingEntryId(null);
                  }}
                />
              </Field>
            </div>

            <Field label="Homework / Diary Content">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="e.g. Complete Exercise 4.2, Q1–8. Revise rounding numbers for tomorrow's quiz."
                className={textareaBase}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Page number" hint="Optional">
                <TextInput value={pageNumber} onChange={(e) => setPageNumber(e.target.value)} placeholder="e.g. 42–44" />
              </Field>
              <Field label="Due date" hint="Optional">
                <DatePicker value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>

            <Field label="Attachment" hint="Optional">
              {attachment ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3.5 py-2.5 text-sm dark:border-brand-400/25 dark:bg-brand-500/10">
                  <span className="flex min-w-0 items-center gap-2 text-brand-700 dark:text-brand-300">
                    <CloudArrowUpIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{attachment.name}</span>
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="shrink-0 rounded-full p-1 text-brand-500 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-white/10"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors ${
                    dragOver
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:border-brand-400/60 dark:hover:text-brand-300"
                  }`}
                >
                  <CloudArrowUpIcon className="h-6 w-6" />
                  <span>
                    <span className="font-medium">Click to upload</span> or drag a worksheet / photo here
                  </span>
                  <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </Field>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-3.5 dark:border-white/[0.08]">
              <Button
                variant="secondary"
                onClick={() => handleSubmit(true)}
                loading={savingDraft}
                disabled={!subjectId || !content.trim() || submitting}
              >
                Save as Draft
              </Button>
              <Button
                size="lg"
                onClick={() => handleSubmit(false)}
                loading={submitting}
                disabled={!subjectId || !content.trim() || savingDraft}
              >
                {editingEntry ? "Update Entry" : "Submit Diary Entry"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Today's Entries</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {submittedSubjectIds.size} of {subjects.length} subjects submitted
            </span>
          </CardHeader>
          <CardBody>
            {missingSubjects.length > 0 && subjects.length > 0 && (
              <div className="mb-3.5 flex flex-wrap items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs dark:bg-amber-500/10">
                <span className="font-medium text-amber-700 dark:text-amber-300">Still missing:</span>
                {missingSubjects.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  >
                    {s.name} — {s.classSectionName}
                  </span>
                ))}
              </div>
            )}

            {entriesLoading ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-5 w-5" />
              </div>
            ) : todaysEntries.length === 0 ? (
              <p className="py-4 text-sm text-slate-400 dark:text-slate-500">No diary entries written for this date yet.</p>
            ) : (
              <div className="space-y-2.5">
                {todaysEntries.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 transition-colors hover:border-slate-200 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.14]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {e.subjectName} <span className="font-normal text-slate-400 dark:text-slate-500">— {e.classSectionName}</span>
                        </span>
                        {e.status === "SUBMITTED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                            ✓ Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.08] dark:text-slate-300 dark:ring-white/10">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatTime(e.updatedAt)}</span>
                        <button
                          onClick={() => startEdit(e)}
                          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{e.content}</p>
                    {(e.pageNumber || e.dueDate || e.hasAttachment) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {e.pageNumber && <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:ring-white/10">Pg. {e.pageNumber}</span>}
                        {e.dueDate && (
                          <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:ring-white/10">
                            Due {new Date(e.dueDate + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {e.hasAttachment && (
                          <button
                            onClick={() => diaryApi.downloadDiaryAttachment(e.id, e.attachmentFilename ?? "attachment")}
                            className="flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            <ArrowDownTrayIcon className="h-3 w-3" /> {e.attachmentFilename}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
