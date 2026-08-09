import { useEffect, useState } from "react";
import { BriefcaseIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonCardGrid } from "../../components/Skeleton";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import { Spinner } from "../../components/Spinner";
import * as profileApi from "../../api/teacherProfile";
import { errorMessage } from "../../api/client";
import { DAYS_OF_WEEK, type DayOfWeek, type TeacherDirectoryEntry, type TeacherProfile } from "../../types/profile";

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

  useEffect(() => {
    profileApi
      .getDirectory()
      .then(setTeachers)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

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
      <PageHeader title="Teacher Directory" description="Every teacher's profile, subjects, and timetable in one place." />

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
                  <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="truncate text-xs text-slate-500">{t.designation || "No designation set"}</p>
                  <div className="mt-1.5">
                    <Badge tone="indigo">
                      {t.subjectCount} {t.subjectCount === 1 ? "class" : "classes"}
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
                <p className="text-base font-semibold text-slate-900">{detail.name}</p>
                <p className="text-sm text-slate-500">{detail.designation || "No designation set"}</p>
                <p className="text-xs text-slate-400">{detail.email}</p>
              </div>
            </div>

            {detail.bio && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{detail.bio}</p>}

            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <BriefcaseIcon className="h-3.5 w-3.5" /> Subjects & Classes
              </h4>
              {detail.subjects.length === 0 ? (
                <p className="text-sm text-slate-400">No subjects assigned.</p>
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
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Timetable</h4>
              {detail.timetable.length === 0 ? (
                <p className="text-sm text-slate-400">No timetable added.</p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {[...detail.timetable]
                    .sort((a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek))
                    .map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium text-slate-700">{DAY_LABELS[slot.dayOfWeek]}</span>
                        <span className="text-slate-500">
                          {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                        </span>
                        <span className="text-slate-500">{slot.subjectName ?? "General"}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
