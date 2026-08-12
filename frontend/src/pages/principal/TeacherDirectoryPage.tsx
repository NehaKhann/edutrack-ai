import { useEffect, useState } from "react";
import { BriefcaseIcon, PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonCardGrid } from "../../components/Skeleton";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { Field, TextInput, Select } from "../../components/FormFields";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import { Spinner } from "../../components/Spinner";
import * as profileApi from "../../api/teacherProfile";
import * as subjectsApi from "../../api/subjects";
import { listClassSections } from "../../api/classSections";
import { listTeachers } from "../../api/teachers";
import { errorMessage } from "../../api/client";
import { DAYS_OF_WEEK, type DayOfWeek, type TeacherDirectoryEntry, type TeacherProfile } from "../../types/profile";
import type { ClassSectionSummary, TeacherSummary } from "../../types/roster";
import type { Subject } from "../../types";

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export function TeacherDirectoryPage() {
  const [teachers, setTeachers] = useState<TeacherDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TeacherProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [subjectsModalOpen, setSubjectsModalOpen] = useState(false);

  useEffect(() => {
    refreshDirectory();
  }, []);

  function refreshDirectory() {
    profileApi
      .getDirectory()
      .then(setTeachers)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  async function openDetail(teacherId: number) {
    setSelectedId(teacherId);
    setDetailLoading(true);
    try {
      const data = await profileApi.getTeacherProfile(teacherId);
      setDetail(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Teacher Directory"
        description="Every teacher's profile, subjects, and timetable in one place."
        actions={
          <Button variant="secondary" onClick={() => setSubjectsModalOpen(true)}>
            <Squares2X2Icon className="h-4 w-4" /> Manage Subjects
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <SkeletonCardGrid count={4} />
      ) : teachers.length === 0 ? (
        <EmptyState title="No teachers yet" description="Teacher accounts will appear here once provisioned." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t) => (
            <Card key={t.teacherId} interactive onClick={() => openDetail(t.teacherId)}>
              <CardBody className="flex items-center gap-4">
                <ProfilePhoto path={profileApi.teacherPhotoPath(t.teacherId)} hasPhoto={t.hasPhoto} name={t.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{t.designation || "No designation set"}</p>
                  <div className="mt-1.5">
                    <Badge tone="indigo">
                      {t.subjectCount} {t.subjectCount === 1 ? "subject" : "subjects"}
                    </Badge>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={selectedId !== null} onClose={() => setSelectedId(null)} title={detail?.name ?? "Teacher profile"}>
        {detailLoading || !detail ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <ProfilePhoto path={profileApi.teacherPhotoPath(detail.teacherId)} hasPhoto={detail.hasPhoto} name={detail.name} size="lg" />
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{detail.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{detail.designation || "No designation set"}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{detail.email}</p>
              </div>
            </div>

            {detail.bio && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">{detail.bio}</p>
            )}

            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <BriefcaseIcon className="h-3.5 w-3.5" /> Subjects & Classes
              </h4>
              {detail.subjects.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No subjects assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.subjects.map((s) => (
                    <Badge key={s.id} tone="indigo">
                      {s.name} — {s.classSectionName}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Timetable</h4>
              {detail.timetable.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No timetable added.</p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-white/[0.08] dark:border-white/10">
                  {[...detail.timetable]
                    .sort((a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek))
                    .map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{DAY_LABELS[slot.dayOfWeek]}</span>
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">
                          {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">{slot.subjectName ?? "General"}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {subjectsModalOpen && (
        <ManageSubjectsModal
          onClose={() => {
            setSubjectsModalOpen(false);
            refreshDirectory();
          }}
        />
      )}
    </div>
  );
}

function ManageSubjectsModal({ onClose }: { onClose: () => void }) {
  const [classSections, setClassSections] = useState<ClassSectionSummary[]>([]);
  const [classSectionId, setClassSectionId] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([listClassSections(), listTeachers()])
      .then(([cs, ts]) => {
        setClassSections(cs);
        setTeachers(ts);
        if (cs.length > 0) setClassSectionId(cs[0].id);
        if (ts.length > 0) setNewSubjectTeacherId(ts[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (!classSectionId) return;
    setLoading(true);
    subjectsApi
      .listSubjects(classSectionId)
      .then(setSubjects)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [classSectionId]);

  async function handleCreate() {
    if (!classSectionId || !newSubjectName.trim() || !newSubjectTeacherId) return;
    setCreating(true);
    setError(null);
    try {
      const created = await subjectsApi.createSubject(classSectionId, newSubjectName.trim(), newSubjectTeacherId);
      setSubjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubjectName("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleReassign(subject: Subject, teacherId: number) {
    setSavingId(subject.id);
    setError(null);
    try {
      const updated = await subjectsApi.updateSubject(subject.id, subject.name, teacherId);
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? updated : s)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Modal open onClose={onClose} title="Manage Subjects" widthClass="max-w-lg">
      <div className="space-y-5">
        {error && <Alert type="error">{error}</Alert>}

        <ClassSectionPicker classSections={classSections} value={classSectionId} onChange={setClassSectionId} />

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subjects in this Class</h4>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No subjects yet in this class.</p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-white/[0.08] dark:border-white/10">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                  <Select
                    value={s.teacherId}
                    onChange={(e) => handleReassign(s, Number(e.target.value))}
                    className="w-40"
                    disabled={savingId === s.id}
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-white/10">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Add a Subject to this Class</h4>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Subject name">
              <TextInput value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="e.g. Science" />
            </Field>
            <Field label="Teacher">
              <Select value={newSubjectTeacherId ?? ""} onChange={(e) => setNewSubjectTeacherId(Number(e.target.value))} className="w-40">
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button size="sm" onClick={handleCreate} loading={creating} disabled={!newSubjectName.trim() || !newSubjectTeacherId}>
              <PlusIcon className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            The same teacher can be assigned to as many subjects as needed — here or across other classes.
          </p>
        </div>
      </div>
    </Modal>
  );
}
