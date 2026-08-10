import { useEffect, useState } from "react";
import { CheckCircleIcon, XCircleIcon, PlusIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { SubjectSelect } from "../../components/SubjectSelect";
import { Card, CardBody } from "../../components/Card";
import { Button } from "../../components/Button";
import { Select } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { StatusBadge } from "../../components/Badge";
import { getMySubjects } from "../../api/subjects";
import * as lessonPlanApi from "../../api/lessonPlan";
import * as syllabusApi from "../../api/syllabus";
import * as calendarApi from "../../api/calendar";
import { errorMessage } from "../../api/client";
import type { LessonPlanEntry, Subject, Topic } from "../../types";
import type { DayOfWeek } from "../../types/profile";

const JS_DAY_TO_ENUM: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const MISS_REASONS = ["Teacher on leave", "Other school engagement", "Ran out of time", "Other"];

export function LessonPlanPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [entries, setEntries] = useState<LessonPlanEntry[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [dayOffReason, setDayOffReason] = useState<string | null>(null);

  const now = new Date();
  const today = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    getMySubjects()
      .then((subs) => {
        setSubjects(subs);
        if (subs.length > 0) setSubjectId(subs[0].id);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));

    calendarApi
      .getMonthView(now.getFullYear(), now.getMonth() + 1)
      .then((view) => {
        const todayDayOfWeek = JS_DAY_TO_ENUM[now.getDay()];
        const override = view.overrides.find((o) => o.date === todayIso);
        if (override) {
          if (override.status === "OFF") setDayOffReason(`${override.reason || "Off day"} — no school today.`);
        } else if (view.weekendDays.includes(todayDayOfWeek)) {
          setDayOffReason("It's the weekend — no school today.");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    loadEntries(subjectId);
    loadAvailableTopics(subjectId);
  }, [subjectId]);

  async function loadEntries(sid: number) {
    setError(null);
    try {
      const data = await lessonPlanApi.getToday(sid);
      setEntries(data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function loadAvailableTopics(sid: number) {
    try {
      const syllabi = await syllabusApi.listSyllabi(sid);
      if (syllabi.length === 0) {
        setAvailableTopics([]);
        return;
      }
      const latest = syllabi[syllabi.length - 1];
      const topics = await syllabusApi.listTopics(latest.id);
      setAvailableTopics(topics.filter((t) => !t.covered));
    } catch {
      setAvailableTopics([]);
    }
  }

  function updateEntry(updated: LessonPlanEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function handleConfirmCovered(entryId: number) {
    try {
      const updated = await lessonPlanApi.confirmEntry(entryId, "COVERED");
      updateEntry(updated);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleConfirmMissed(entryId: number, reason: string) {
    try {
      const updated = await lessonPlanApi.confirmEntry(entryId, "MISSED", reason);
      updateEntry(updated);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleAddTopic(topicId: number) {
    if (!subjectId) return;
    try {
      const created = await lessonPlanApi.addEntry(subjectId, topicId);
      setEntries((prev) => [...prev, created]);
      setShowAddTopic(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const usedTopicIds = new Set(entries.map((e) => e.topicId));
  const pickableTopics = availableTopics.filter((t) => !usedTopicIds.has(t.id));

  return (
    <div>
      <PageHeader
        title="Today's Plan"
        description={
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="h-4 w-4" /> {today}
          </span>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {subjects.length === 0 ? (
        <EmptyState title="No subjects assigned" description="Ask your Admin to assign you a subject first." />
      ) : (
        <>
          <div className="mb-5">
            <SubjectSelect subjects={subjects} value={subjectId} onChange={setSubjectId} />
          </div>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <EmptyState
                title={dayOffReason ? "No school today" : "Nothing planned for today"}
                description={
                  dayOffReason ?? "This subject's syllabus may not have any topics left, or none uploaded yet."
                }
              />
            ) : (
              entries.map((entry) => <LessonPlanCard key={entry.id} entry={entry} onCovered={handleConfirmCovered} onMissed={handleConfirmMissed} />)
            )}

            {pickableTopics.length > 0 && (
              <div>
                {!showAddTopic ? (
                  <Button variant="secondary" size="sm" onClick={() => setShowAddTopic(true)}>
                    <PlusIcon className="h-4 w-4" /> Add another topic for today
                  </Button>
                ) : (
                  <Card>
                    <CardBody className="flex items-center gap-3">
                      <Select
                        className="max-w-sm"
                        defaultValue=""
                        onChange={(e) => e.target.value && handleAddTopic(Number(e.target.value))}
                      >
                        <option value="" disabled>
                          Choose a topic...
                        </option>
                        {pickableTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddTopic(false)}>
                        Cancel
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LessonPlanCard({
  entry,
  onCovered,
  onMissed,
}: {
  entry: LessonPlanEntry;
  onCovered: (id: number) => void;
  onMissed: (id: number, reason: string) => void;
}) {
  const [showMissForm, setShowMissForm] = useState(false);
  const [reason, setReason] = useState(MISS_REASONS[0]);
  const isOpen = entry.status === "PLANNED" || entry.status === "RESCHEDULED";

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.topicTitle}</h3>
              {entry.status === "RESCHEDULED" && <StatusBadge status="RESCHEDULED" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{entry.subjectName}</p>
          </div>
          {!isOpen && <StatusBadge status={entry.status} />}
        </div>

        {entry.reason && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Reason: {entry.reason}</p>}

        {isOpen && (
          <div className="mt-3">
            {!showMissForm ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onCovered(entry.id)}>
                  <CheckCircleIcon className="h-4 w-4" /> Covered as planned
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowMissForm(true)}>
                  <XCircleIcon className="h-4 w-4" /> Not delivered
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 dark:bg-white/5">
                <Select value={reason} onChange={(e) => setReason(e.target.value)} className="max-w-xs">
                  {MISS_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                <Button size="sm" variant="danger" onClick={() => onMissed(entry.id, reason)}>
                  Confirm not delivered
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowMissForm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
