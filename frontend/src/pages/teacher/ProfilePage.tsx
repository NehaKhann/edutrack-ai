import { useEffect, useState } from "react";
import { CameraIcon, PlusIcon, TrashIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, Select, TextInput } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { Spinner, FullPageSpinner } from "../../components/Spinner";
import { Badge } from "../../components/Badge";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import * as profileApi from "../../api/teacherProfile";
import { errorMessage } from "../../api/client";
import { DAYS_OF_WEEK, type DayOfWeek, type TeacherProfile } from "../../types/profile";

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function ProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);

  useEffect(() => {
    profileApi
      .getMyProfile()
      .then(setProfile)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (!profile) return <Alert type="error">{error ?? "Could not load your profile."}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="How you appear to the Principal and across EduTrack AI." />

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <PhotoCard profile={profile} photoVersion={photoVersion} onUploaded={() => setPhotoVersion((v) => v + 1)} />
          <SubjectsCard profile={profile} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <DetailsCard profile={profile} onSaved={setProfile} onError={(e) => setError(errorMessage(e))} />
          <TimetableCard profile={profile} onChange={setProfile} onError={(e) => setError(errorMessage(e))} />
        </div>
      </div>
    </div>
  );
}

function PhotoCard({
  profile,
  photoVersion,
  onUploaded,
}: {
  profile: TeacherProfile;
  photoVersion: number;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setLocalError(null);
    try {
      await profileApi.uploadMyPhoto(file, setProgress);
      onUploaded();
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-8">
        <ProfilePhoto
          path={profileApi.myPhotoPath()}
          hasPhoto={profile.hasPhoto}
          name={profile.name}
          size="lg"
          refreshKey={photoVersion}
        />
        <div className="text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{profile.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{profile.designation || "No designation set"}</p>
        </div>

        {localError && <Alert type="error">{localError}</Alert>}

        <label>
          <span className="sr-only">Upload photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.12]">
            {uploading ? <Spinner className="h-4 w-4" /> : <CameraIcon className="h-4 w-4" />}
            {uploading ? `Uploading ${progress}%` : "Change photo"}
          </span>
        </label>
      </CardBody>
    </Card>
  );
}

function SubjectsCard({ profile }: { profile: TeacherProfile }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <BriefcaseIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Subjects & Classes
        </h3>
      </CardHeader>
      <CardBody className="space-y-2">
        {profile.subjects.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No subjects assigned yet.</p>
        ) : (
          profile.subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
              <span className="font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
              <Badge tone="indigo">{s.classSectionName}</Badge>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function DetailsCard({
  profile,
  onSaved,
  onError,
}: {
  profile: TeacherProfile;
  onSaved: (p: TeacherProfile) => void;
  onError: (e: unknown) => void;
}) {
  const [designation, setDesignation] = useState(profile.designation ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await profileApi.updateMyProfile({ designation, bio });
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">About</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <Field label="Designation / Title">
          <TextInput
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Senior Mathematics Teacher"
          />
        </Field>
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="A short introduction — experience, teaching philosophy, achievements..."
            className="block w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>
            Save changes
          </Button>
          {saved && <span className="text-sm text-teal-600 dark:text-teal-400">Saved</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function TimetableCard({
  profile,
  onChange,
  onError,
}: {
  profile: TeacherProfile;
  onChange: (p: TeacherProfile) => void;
  onError: (e: unknown) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subjectId, setSubjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    setSubmitting(true);
    try {
      await profileApi.addTimetableSlot({
        dayOfWeek,
        startTime,
        endTime,
        subjectId: subjectId ? Number(subjectId) : null,
      });
      const fresh = await profileApi.getMyProfile();
      onChange(fresh);
      setAdding(false);
    } catch (e) {
      onError(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slotId: number) {
    try {
      await profileApi.deleteTimetableSlot(slotId);
      onChange({ ...profile, timetable: profile.timetable.filter((s) => s.id !== slotId) });
    } catch (e) {
      onError(e);
    }
  }

  const sorted = [...profile.timetable].sort((a, b) => {
    const dayDiff = DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek);
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime);
  });

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Timetable</h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <PlusIcon className="h-4 w-4" /> Add slot
        </Button>
      </CardHeader>
      <CardBody className="space-y-2">
        {adding && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-white/5 sm:grid-cols-4">
            <Field label="Day">
              <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start">
              <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="End">
              <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
            <Field label="Subject (optional)">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">General</option>
                {profile.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.classSectionName}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="col-span-full flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} loading={submitting}>
                Add
              </Button>
            </div>
          </div>
        )}

        {sorted.length === 0 && !adding ? (
          <p className="py-4 text-sm text-slate-400 dark:text-slate-500">No timetable slots added yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
            {sorted.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{DAY_LABELS[slot.dayOfWeek]}</span>
                  <span className="ml-2 tabular-nums text-slate-500 dark:text-slate-400">
                    {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                  </span>
                  {slot.subjectName && <span className="ml-2 text-slate-500 dark:text-slate-400">· {slot.subjectName}</span>}
                </div>
                <button
                  onClick={() => handleDelete(slot.id)}
                  className="text-slate-400 hover:text-coral-600 dark:text-slate-500 dark:hover:text-coral-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
