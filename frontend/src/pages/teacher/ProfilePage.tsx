import { useEffect, useRef, useState } from "react";
import {
  CameraIcon,
  BriefcaseIcon,
  XMarkIcon,
  CheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { FullPageSpinner } from "../../components/Spinner";
import { Badge } from "../../components/Badge";
import { Toast } from "../../components/Toast";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import * as profileApi from "../../api/teacherProfile";
import { apiClient, errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { TeacherProfile } from "../../types/profile";

const BIO_MAX_LENGTH = 300;

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    profileApi
      .getMyProfile()
      .then(setProfile)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (!profile) return <Alert type="error">{error ?? "Could not load your profile."}</Alert>;

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  function handlePasswordChanged() {
    setProfile((p) => (p ? { ...p, mustChangePassword: false } : p));
    updateUser({ mustChangePassword: false });
    notify("Password changed successfully.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="How you appear to the Principal and across the app." />

      {user?.mustChangePassword && (
        <Alert type="warning">
          You're signed in with a temporary password from the Principal. Please set a new password below before continuing.
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-1">
          <PhotoCard profile={profile} photoVersion={photoVersion} onUploaded={() => setPhotoVersion((v) => v + 1)} onToast={notify} />
          <SubjectsCard profile={profile} />
          <CvCard profile={profile} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <DetailsCard profile={profile} onSaved={setProfile} onError={(e) => setError(errorMessage(e))} onToast={notify} />
          <ChangePasswordCard forced={!!user?.mustChangePassword} onChanged={handlePasswordChanged} onError={(e) => notify(errorMessage(e), "error")} />
        </div>
      </div>

      <Toast message={toast?.message ?? null} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

function CvCard({ profile }: { profile: TeacherProfile }) {
  const [downloading, setDownloading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setLocalError(null);
    try {
      const res = await apiClient.get(profileApi.myCvPath(), { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = profile.cvFilename ?? "cv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <DocumentTextIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /> CV / Resume
        </h3>
      </CardHeader>
      <CardBody className="space-y-3">
        {localError && <Alert type="error">{localError}</Alert>}
        {profile.hasCv ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 dark:bg-white/5">
            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{profile.cvFilename ?? "cv"}</span>
            <Button size="sm" variant="secondary" onClick={handleDownload} loading={downloading}>
              <ArrowDownTrayIcon className="h-4 w-4" /> Download
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">No CV uploaded by the Principal yet.</p>
        )}
      </CardBody>
    </Card>
  );
}

function ChangePasswordCard({
  forced,
  onChanged,
  onError,
}: {
  forced: boolean;
  onChanged: () => void;
  onError: (e: unknown) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit() {
    setLocalError(null);
    if (newPassword.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      await profileApi.changeMyPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={forced ? "ring-2 ring-amber-400/60 dark:ring-amber-500/40" : undefined}>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <KeyIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Change Password
        </h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {localError && <Alert type="error">{localError}</Alert>}
        <Field label={forced ? "Temporary password" : "Current password"}>
          <TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="Confirm new password">
          <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button onClick={handleSubmit} loading={saving} disabled={!currentPassword || !newPassword || !confirmPassword}>
          Update password
        </Button>
      </CardBody>
    </Card>
  );
}

function PhotoCard({
  profile,
  photoVersion,
  onUploaded,
  onToast,
}: {
  profile: TeacherProfile;
  photoVersion: number;
  onUploaded: () => void;
  onToast: (message: string, type?: "success" | "error") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(file: File | null) {
    if (!file) return;
    setLocalError(null);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setProgress(0);
    setLocalError(null);
    try {
      await profileApi.uploadMyPhoto(pendingFile, setProgress);
      cancelPreview();
      onUploaded();
      onToast("Profile photo updated.");
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-8">
        <div className="group relative">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-32 w-32 rounded-full object-cover ring-2 ring-brand-400" />
          ) : (
            <ProfilePhoto path={profileApi.myPhotoPath()} hasPhoto={profile.hasPhoto} name={profile.name} size="xl" refreshKey={photoVersion} />
          )}

          {!previewUrl && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Change photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-navy-900/0 text-white opacity-0 transition-all duration-200 group-hover:bg-navy-900/55 group-hover:opacity-100"
            >
              <CameraIcon className="h-7 w-7" />
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{profile.name}</p>
          {profile.designation ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
              {profile.designation}
            </span>
          ) : (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Add a designation in the About section below</p>
          )}
        </div>

        {localError && <Alert type="error">{localError}</Alert>}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
        />

        {pendingFile ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={cancelPreview} disabled={uploading}>
              <XMarkIcon className="h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={confirmUpload} loading={uploading}>
              <CheckIcon className="h-4 w-4" /> {uploading ? `Uploading ${progress}%` : "Save photo"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
            <CameraIcon className="h-4 w-4" /> Change photo
          </Button>
        )}
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
      <CardBody className="space-y-2.5">
        {profile.subjects.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No subjects assigned yet.</p>
        ) : (
          profile.subjects.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm transition-colors hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/[0.08]"
            >
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
  onToast,
}: {
  profile: TeacherProfile;
  onSaved: (p: TeacherProfile) => void;
  onError: (e: unknown) => void;
  onToast: (message: string, type?: "success" | "error") => void;
}) {
  const [designation, setDesignation] = useState(profile.designation ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await profileApi.updateMyProfile({ designation, bio, phone });
      onSaved(updated);
      onToast("Profile updated successfully.");
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
        <Field label="Phone number">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +92 300 1234567" />
        </Field>
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            rows={4}
            maxLength={BIO_MAX_LENGTH}
            placeholder="A short introduction — experience, teaching philosophy, achievements..."
            className="block w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <span className="mt-1 block text-right text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {bio.length} / {BIO_MAX_LENGTH}
          </span>
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>
            Save changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
