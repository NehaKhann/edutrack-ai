import { useEffect, useRef, useState } from "react";
import {
  BriefcaseIcon,
  PlusIcon,
  Squares2X2Icon,
  UserMinusIcon,
  ArrowUturnLeftIcon,
  UserPlusIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FaceSmileIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonCardGrid } from "../../components/Skeleton";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Field, TextInput, Select } from "../../components/FormFields";
import { ClassSectionPicker } from "../../components/ClassSectionPicker";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import { Spinner } from "../../components/Spinner";
import { Toast } from "../../components/Toast";
import * as profileApi from "../../api/teacherProfile";
import * as subjectsApi from "../../api/subjects";
import * as faceApi from "../../api/faceRecognition";
import { listClassSections } from "../../api/classSections";
import { listTeachers } from "../../api/teachers";
import { apiClient, errorMessage } from "../../api/client";
import { downloadBlob } from "../../lib/download";
import type { TeacherAccount, TeacherDirectoryEntry, TeacherImportResult, TeacherProfile } from "../../types/profile";
import type { ClassSectionSummary, TeacherSummary } from "../../types/roster";
import type { Subject } from "../../types";
import type { PendingFaceEnrollment } from "../../types/face";

export function TeacherDirectoryPage() {
  const [teachers, setTeachers] = useState<TeacherDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TeacherProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewingInactive, setViewingInactive] = useState(false);
  const [subjectsModalOpen, setSubjectsModalOpen] = useState(false);
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);

  const [showInactive, setShowInactive] = useState(false);
  const [inactiveTeachers, setInactiveTeachers] = useState<TeacherDirectoryEntry[] | null>(null);
  const [inactiveLoading, setInactiveLoading] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<TeacherProfile | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);

  const [pendingEnrollments, setPendingEnrollments] = useState<PendingFaceEnrollment[]>([]);
  const [reviewingEnrollment, setReviewingEnrollment] = useState<PendingFaceEnrollment | null>(null);

  useEffect(() => {
    refreshDirectory();
    refreshPendingEnrollments();
  }, []);

  function refreshPendingEnrollments() {
    faceApi.listPendingFaceEnrollments().then(setPendingEnrollments).catch(() => {});
  }

  function refreshDirectory() {
    profileApi
      .getDirectory()
      .then(setTeachers)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  function toggleShowInactive() {
    if (!showInactive && inactiveTeachers === null) {
      setInactiveLoading(true);
      profileApi
        .getInactiveDirectory()
        .then(setInactiveTeachers)
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setInactiveLoading(false));
    }
    setShowInactive((v) => !v);
  }

  async function openDetail(teacherId: number, inactive = false) {
    setSelectedId(teacherId);
    setViewingInactive(inactive);
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

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await profileApi.deactivateTeacher(deactivateTarget.teacherId);
      setDeactivateTarget(null);
      setSelectedId(null);
      setDetail(null);
      setInactiveTeachers(null);
      refreshDirectory();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeactivating(false);
    }
  }

  async function handleReactivate(teacherId: number) {
    setReactivatingId(teacherId);
    try {
      await profileApi.reactivateTeacher(teacherId);
      setInactiveTeachers((prev) => (prev ? prev.filter((t) => t.teacherId !== teacherId) : prev));
      if (selectedId === teacherId) setSelectedId(null);
      refreshDirectory();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReactivatingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Teacher Directory"
        description="Every teacher's profile, subjects, and timetable in one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setAccountsModalOpen(true)}>
              <UserPlusIcon className="h-4 w-4" /> Manage Teacher Accounts
            </Button>
            <Button variant="secondary" onClick={() => setSubjectsModalOpen(true)}>
              <Squares2X2Icon className="h-4 w-4" /> Manage Subjects
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {pendingEnrollments.length > 0 && (
        <Card className="mb-4 overflow-hidden">
          <CardHeader>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <FaceSmileIcon className="h-4 w-4 text-amber-500" /> Pending Face Enrollments ({pendingEnrollments.length})
            </h3>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.08]">
            {pendingEnrollments.map((e) => (
              <button
                key={e.teacherId}
                onClick={() => setReviewingEnrollment(e)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{e.teacherName}</span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Review
                </span>
              </button>
            ))}
          </div>
        </Card>
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

      {!loading && (
        <div className="mt-5">
          <button
            onClick={toggleShowInactive}
            className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            {showInactive ? "Hide" : "Show"} removed teachers
          </button>

          {showInactive && (
            <div className="mt-3">
              {inactiveLoading ? (
                <SkeletonCardGrid count={2} />
              ) : !inactiveTeachers || inactiveTeachers.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No removed teachers.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inactiveTeachers.map((t) => (
                    <Card key={t.teacherId} className="opacity-70">
                      <CardBody className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetail(t.teacherId, true)}>
                          <ProfilePhoto path={profileApi.teacherPhotoPath(t.teacherId)} hasPhoto={t.hasPhoto} name={t.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{t.name}</p>
                            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{t.designation || "No designation set"}</p>
                          </div>
                          <Badge tone="gray">Removed</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReactivate(t.teacherId);
                          }}
                          loading={reactivatingId === t.teacherId}
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivate
                        </Button>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
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

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-white/10">
              {viewingInactive ? (
                <Button variant="secondary" onClick={() => handleReactivate(detail.teacherId)} loading={reactivatingId === detail.teacherId}>
                  <ArrowUturnLeftIcon className="h-4 w-4" /> Reactivate Teacher
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setDeactivateTarget(detail)}>
                  <UserMinusIcon className="h-4 w-4" /> Remove Teacher
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deactivateTarget !== null}
        title="Remove this teacher?"
        message={
          <>
            <strong>{deactivateTarget?.name}</strong> will no longer be able to sign in, and won't appear in teacher-selection lists
            going forward. Their existing attendance records, diary entries, and subject history are kept exactly as they are — you
            can reactivate them later from "Show removed teachers".
          </>
        }
        confirmLabel="Remove"
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {subjectsModalOpen && (
        <ManageSubjectsModal
          onClose={() => {
            setSubjectsModalOpen(false);
            refreshDirectory();
          }}
        />
      )}

      {accountsModalOpen && (
        <ManageAccountsModal
          onClose={() => {
            setAccountsModalOpen(false);
            refreshDirectory();
          }}
        />
      )}

      {reviewingEnrollment && (
        <FaceEnrollmentReviewModal
          enrollment={reviewingEnrollment}
          onClose={() => setReviewingEnrollment(null)}
          onReviewed={() => {
            setReviewingEnrollment(null);
            refreshPendingEnrollments();
          }}
        />
      )}
    </div>
  );
}

function FaceEnrollmentReviewModal({
  enrollment,
  onClose,
  onReviewed,
}: {
  enrollment: PendingFaceEnrollment;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    apiClient
      .get(faceApi.faceEnrollmentPhotoPath(enrollment.teacherId), { responseType: "blob" })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setPhotoUrl(objectUrl);
      })
      .catch(() => setPhotoError(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollment.teacherId]);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      await faceApi.approveFaceEnrollment(enrollment.teacherId);
      onReviewed();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError(null);
    try {
      await faceApi.rejectFaceEnrollment(enrollment.teacherId, reason.trim() || undefined);
      onReviewed();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Review ${enrollment.teacherName}'s Face Enrollment`} widthClass="max-w-sm">
      {error && (
        <div className="mb-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Confirm this is really {enrollment.teacherName} before approving — once approved, this photo's descriptor is used to verify future attendance scans.
      </p>
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
        {photoUrl ? (
          <img src={photoUrl} alt={`${enrollment.teacherName}'s enrollment photo`} className="h-full w-full object-cover" />
        ) : photoError ? (
          <p className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">Couldn't load the photo.</p>
        ) : (
          <Spinner className="h-6 w-6" />
        )}
      </div>

      {rejecting ? (
        <div className="mt-3 space-y-2.5">
          <Field label="Reason (optional)" hint="Shown to the teacher so they know what to fix.">
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Photo is blurry, please retake" />
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setRejecting(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1 justify-center" onClick={handleReject} loading={submitting}>
              Confirm Reject
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button variant="danger" className="flex-1 justify-center" onClick={() => setRejecting(true)} disabled={submitting}>
            Reject
          </Button>
          <Button className="flex-1 justify-center" onClick={handleApprove} loading={submitting}>
            Approve
          </Button>
        </div>
      )}
    </Modal>
  );
}

function ManageAccountsModal({ onClose }: { onClose: () => void }) {
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeacherAccount | null>(null);
  const [resetting, setResetting] = useState(false);

  function refresh() {
    setLoading(true);
    profileApi
      .listAccounts()
      .then(setAccounts)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleDownloadCv(account: TeacherAccount) {
    try {
      const res = await apiClient.get(profileApi.teacherCvPath(account.teacherId), { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = account.cvFilename ?? "cv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const updated = await profileApi.resetPassword(resetTarget.teacherId);
      setAccounts((prev) => prev.map((a) => (a.teacherId === updated.teacherId ? updated : a)));
      setResetTarget(null);
      setToast("Password reset — share the new temporary password with the teacher.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResetting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Manage Teacher Accounts" widthClass="max-w-3xl">
      <div className="space-y-5">
        {error && <Alert type="error">{error}</Alert>}

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create logins for new or existing teachers, and keep track of who still needs to change their temporary password.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <ArrowUpTrayIcon className="h-4 w-4" /> Import Teachers
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlusIcon className="h-4 w-4" /> Create Account
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No teacher accounts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Teacher</th>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Current Password</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">CV</th>
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                {accounts.map((a) => (
                  <tr key={a.teacherId}>
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{a.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{a.email}</td>
                    <td className="px-4 py-2.5">
                      {a.tempPassword ? (
                        <TempPasswordCell password={a.tempPassword} onCopied={() => setToast("Password copied to clipboard.")} />
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Hidden — changed by teacher</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={a.passwordChanged ? "green" : "amber"}>{a.passwordChanged ? "Password Changed" : "Password Not Changed"}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {a.hasCv ? (
                        <button
                          onClick={() => handleDownloadCv(a)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Download
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setResetTarget(a)}
                        className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateAccountModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}

      {importOpen && (
        <ImportTeachersModal
          onClose={() => setImportOpen(false)}
          onImported={refresh}
        />
      )}

      <Toast message={toast} type="success" onClose={() => setToast(null)} />

      <ConfirmModal
        open={resetTarget !== null}
        title="Reset this teacher's password?"
        message={
          <>
            <strong>{resetTarget?.name}</strong>'s current password will stop working immediately. A new temporary password will be
            generated for you to share with them directly.
          </>
        }
        confirmLabel="Reset Password"
        loading={resetting}
        onConfirm={confirmReset}
        onCancel={() => setResetTarget(null)}
      />
    </Modal>
  );
}

function TempPasswordCell({ password, onCopied }: { password: string; onCopied: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    onCopied();
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
      title="Click to copy"
    >
      {password}
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5 text-slate-400" />}
    </button>
  );
}

function ImportTeachersModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TeacherImportResult | null>(null);

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const blob = await profileApi.downloadTeacherImportTemplate();
      downloadBlob(blob, "teacher-import-template.xlsx");
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
      const res = await profileApi.importTeachers(file);
      setResult(res);
      onImported();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Import Teachers" widthClass="max-w-2xl">
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        {!result ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload an .xlsx file with one teacher per row (Name, Email, Phone). Download the template below to see the expected columns.
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
            <Alert type={result.created.length > 0 ? "success" : "warning"}>
              {result.created.length} teacher{result.created.length === 1 ? "" : "s"} created
              {result.skipped.length > 0 ? `, ${result.skipped.length} row${result.skipped.length === 1 ? "" : "s"} skipped` : ""}.
            </Alert>

            {result.created.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Teacher</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Temporary Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                    {result.created.map((c) => (
                      <tr key={c.email}>
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{c.email}</td>
                        <td className="px-4 py-2.5">
                          <TempPasswordCell password={c.tempPassword} onCopied={() => {}} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.skipped.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
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

function CreateAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TeacherAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (!name.trim() || !email.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const account = await profileApi.createAccount({ name: name.trim(), email: email.trim(), phone: phone.trim(), cv });
      setCreated(account);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!created?.tempPassword) return;
    await navigator.clipboard.writeText(created.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open onClose={onClose} title="Create Teacher Account" widthClass="max-w-md">
      {created ? (
        <div className="space-y-4">
          <Alert type="success">Account created for {created.name}. Share these credentials with them securely.</Alert>
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Username</p>
              <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{created.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Temporary Password</p>
              <button
                onClick={handleCopy}
                className="mt-1 inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 font-mono text-sm text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-navy-800 dark:text-slate-100 dark:ring-white/10"
              >
                {created.tempPassword}
                {copied ? <CheckIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" /> : <ClipboardDocumentIcon className="h-4 w-4 text-slate-400" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={onCreated}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          <Field label="Full name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Malik" />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.edu" />
          </Field>
          <Field label="Phone (optional)">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +92 300 1234567" />
          </Field>
          <Field label="CV / Resume (optional)">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.doc,.docx"
              onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:text-slate-300 dark:file:bg-brand-500/10 dark:file:text-brand-300"
            />
            {cv && (
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <DocumentTextIcon className="h-3.5 w-3.5" /> {cv.name}
              </span>
            )}
          </Field>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Assign subjects and classes afterwards from "Manage Subjects" — a temporary password will be generated automatically.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!name.trim() || !email.trim()}>
              Create Account
            </Button>
          </div>
        </div>
      )}
    </Modal>
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
              {subjects.map((s) => {
                // The subject's current teacher may since have been removed — show them anyway
                // so the dropdown doesn't render blank, but every other option stays active-only.
                const currentTeacherStillActive = teachers.some((t) => t.id === s.teacherId);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                    <Select
                      value={s.teacherId}
                      onChange={(e) => handleReassign(s, Number(e.target.value))}
                      className="w-44"
                      disabled={savingId === s.id}
                    >
                      {!currentTeacherStillActive && (
                        <option key={s.teacherId} value={s.teacherId}>
                          {s.teacherName} (removed)
                        </option>
                      )}
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
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
