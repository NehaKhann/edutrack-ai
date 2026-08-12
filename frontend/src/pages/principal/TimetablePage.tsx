import { useEffect, useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRows } from "../../components/Skeleton";
import { Field, Select } from "../../components/FormFields";
import { SegmentedControl } from "../../components/SegmentedControl";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import { TimetableGrid } from "../../components/TimetableGrid";
import { TimetableCellEditorModal, type CellEditorOption } from "../../components/TimetableCellEditorModal";
import * as timetableApi from "../../api/timetable";
import { listClassSections } from "../../api/classSections";
import { listTeachers } from "../../api/teachers";
import { errorMessage } from "../../api/client";
import type { ClassSectionSummary, TeacherSummary } from "../../types/roster";
import type { Subject } from "../../types";
import type { ClassTimetable, TeacherTimetable, TimetableEntry, Weekday } from "../../types/timetable";

type View = "class" | "teacher";

function applyEntryUpdate<T extends { entries: TimetableEntry[] }>(
  timetable: T,
  day: Weekday,
  period: number,
  newEntry: TimetableEntry | null
): T {
  const filtered = timetable.entries.filter((e) => !(e.dayOfWeek === day && e.period === period));
  return { ...timetable, entries: newEntry ? [...filtered, newEntry] : filtered };
}

export function TimetablePage() {
  const [view, setView] = useState<View>("class");
  const [error, setError] = useState<string | null>(null);
  const [clashWarning, setClashWarning] = useState<string | null>(null);

  const [classSections, setClassSections] = useState<ClassSectionSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classTimetable, setClassTimetable] = useState<ClassTimetable | null>(null);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  const [classLoading, setClassLoading] = useState(false);

  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [teacherTimetable, setTeacherTimetable] = useState<TeacherTimetable | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<Subject[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);

  const [editing, setEditing] = useState<{ day: Weekday; period: number; entry?: TimetableEntry } | null>(null);

  useEffect(() => {
    listClassSections()
      .then((sections) => {
        setClassSections(sections);
        if (sections.length > 0) setSelectedClassId(sections[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
    listTeachers()
      .then((list) => {
        setTeachers(list);
        if (list.length > 0) setSelectedTeacherId(list[0].id);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (selectedClassId == null) return;
    setClassLoading(true);
    Promise.all([timetableApi.getClassTimetable(selectedClassId), timetableApi.getClassSubjects(selectedClassId)])
      .then(([tt, subjects]) => {
        setClassTimetable(tt);
        setClassSubjects(subjects);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setClassLoading(false));
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedTeacherId == null) return;
    setTeacherLoading(true);
    Promise.all([timetableApi.getTeacherTimetable(selectedTeacherId), timetableApi.getTeacherSubjects(selectedTeacherId)])
      .then(([tt, subjects]) => {
        setTeacherTimetable(tt);
        setTeacherSubjects(subjects);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setTeacherLoading(false));
  }, [selectedTeacherId]);

  function openEditor(day: Weekday, period: number, entry: TimetableEntry | undefined) {
    setClashWarning(null);
    setEditing({ day, period, entry });
  }

  async function handleSaveClassCell(subjectId: number | null) {
    if (!selectedClassId || !editing) return;
    const result = await timetableApi.saveCell(selectedClassId, { dayOfWeek: editing.day, period: editing.period, subjectId });
    setClassTimetable((prev) => (prev ? applyEntryUpdate(prev, editing.day, editing.period, result.entry) : prev));
    if (result.clashes.length > 0 && result.entry) {
      setClashWarning(
        `${result.entry.teacherName} is already teaching ${result.clashes.map((c) => c.classSectionName).join(", ")} at this same day and period.`
      );
    } else {
      setClashWarning(null);
    }
  }

  async function handleSaveTeacherCell(subjectId: number | null) {
    if (!editing) return;
    const classSectionId = subjectId != null ? teacherSubjects.find((s) => s.id === subjectId)?.classSectionId : editing.entry?.classSectionId;
    if (classSectionId == null) return;
    const result = await timetableApi.saveCell(classSectionId, { dayOfWeek: editing.day, period: editing.period, subjectId });
    setTeacherTimetable((prev) => (prev ? applyEntryUpdate(prev, editing.day, editing.period, result.entry) : prev));
    if (result.clashes.length > 0 && result.entry) {
      setClashWarning(
        `${result.entry.teacherName} is already teaching ${result.clashes.map((c) => c.classSectionName).join(", ")} at this same day and period.`
      );
    } else {
      setClashWarning(null);
    }
  }

  const classOptions: CellEditorOption[] = classSubjects.map((s) => ({ subjectId: s.id, label: `${s.name} — ${s.teacherName}` }));
  const teacherOptions: CellEditorOption[] = teacherSubjects.map((s) => ({
    subjectId: s.id,
    label: `${s.name} — ${s.classSectionName}`,
  }));

  return (
    <div>
      <PageHeader
        title="Timetable"
        description="Assign subjects and teachers to each period. Class timetables and teacher timetables stay in sync automatically."
        actions={
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "class", label: "By Class", activeClass: "bg-brand-600 text-white" },
              { value: "teacher", label: "By Teacher", activeClass: "bg-brand-600 text-white" },
            ]}
          />
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {clashWarning && (
        <div className="mb-4">
          <Alert type="warning">
            <div className="flex items-start justify-between gap-3">
              <span>{clashWarning}</span>
              <button
                onClick={() => setClashWarning(null)}
                className="shrink-0 text-xs font-semibold text-amber-800 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      {view === "class" ? (
        <div className="space-y-4">
          <ClassSectionPicker classSections={classSections} value={selectedClassId} onChange={setSelectedClassId} />

          {classLoading ? (
            <SkeletonRows count={5} />
          ) : classSections.length === 0 ? (
            <EmptyState icon={<CalendarDaysIcon className="h-8 w-8" />} title="No classes yet" description="Add a class section first." />
          ) : (
            <Card>
              <CardBody>
                <TimetableGrid
                  entries={classTimetable?.entries ?? []}
                  mode="class"
                  editable
                  onCellClick={(day, period, entry) => openEditor(day, period, entry)}
                />
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-w-xs">
            <Field label="Teacher">
              <Select
                value={selectedTeacherId ?? ""}
                onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                disabled={teachers.length === 0}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {teacherLoading ? (
            <SkeletonRows count={5} />
          ) : teachers.length === 0 ? (
            <EmptyState icon={<CalendarDaysIcon className="h-8 w-8" />} title="No teachers yet" description="Add a teacher account first." />
          ) : (
            <Card>
              <CardBody>
                <TimetableGrid
                  entries={teacherTimetable?.entries ?? []}
                  mode="teacher"
                  editable
                  onCellClick={(day, period, entry) => openEditor(day, period, entry)}
                />
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <TimetableCellEditorModal
        open={!!editing}
        onClose={() => setEditing(null)}
        day={editing?.day ?? null}
        period={editing?.period ?? null}
        currentSubjectId={editing?.entry?.subjectId ?? null}
        options={view === "class" ? classOptions : teacherOptions}
        emptyOptionsMessage={
          view === "class"
            ? "This class has no subjects yet. Add subjects for this class first."
            : "This teacher isn't assigned to any subjects yet."
        }
        onSave={view === "class" ? handleSaveClassCell : handleSaveTeacherCell}
      />
    </div>
  );
}
