import { useEffect, useState } from "react";
import clsx from "clsx";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Field, TextInput, Select } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import * as diaryApi from "../../api/diary";
import { listClassSections } from "../../api/classSections";
import { errorMessage } from "../../api/client";
import type { ClassSectionSummary } from "../../types/roster";
import type { DiarySubjectRow } from "../../types/diary";

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

  useEffect(() => {
    listClassSections()
      .then((cs) => {
        setClassSections(cs);
        if (cs.length > 0) setClassSectionId(cs[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
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
  const notSubmitted = rows.filter((r) => !r.entry);
  const className = classSections.find((c) => c.id === classSectionId)?.name ?? "";

  return (
    <div>
      <PageHeader title="Class Diary Overview" description="See what's been assigned across every subject, for any class." />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </Field>
          <Field label="Class">
            <Select value={classSectionId ?? ""} onChange={(e) => setClassSectionId(Number(e.target.value))} className="w-44">
              {classSections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
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
            <strong>
              {notSubmitted.length} of {rows.length} teachers
            </strong>{" "}
            haven't submitted today's diary for <strong>{className}</strong>:{" "}
            {notSubmitted.map((r) => `${r.teacherName} (${r.subjectName})`).join(", ")}.
          </Alert>
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {className} — {date}
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
              {filtered.map((r) => (
                <div key={r.subjectId} className={clsx("flex flex-wrap items-center justify-between gap-3 py-3", !r.entry && "opacity-70")}>
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
                      <strong className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.subjectName}</strong>
                      <p className="mt-0.5 max-w-md truncate text-xs text-slate-500 dark:text-slate-400">
                        {r.teacherName} {r.entry ? `· ${r.entry.content}` : "· —"}
                      </p>
                    </div>
                  </div>
                  {r.entry ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                      ✓ Submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-0.5 text-[11px] font-semibold text-coral-700 ring-1 ring-inset ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20">
                      Not submitted
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
