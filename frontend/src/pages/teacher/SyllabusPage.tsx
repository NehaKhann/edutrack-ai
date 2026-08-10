import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
  PlusIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  DocumentIcon,
  PencilIcon,
  XMarkIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { SubjectSelect } from "../../components/SubjectSelect";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, Select, TextInput } from "../../components/FormFields";
import { Modal } from "../../components/Modal";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { DateRangeChip } from "../../components/DateRangeChip";
import { formatDate } from "../../utils/date";
import { getMySubjects } from "../../api/subjects";
import * as syllabusApi from "../../api/syllabus";
import { errorMessage } from "../../api/client";
import type { DocumentPreviewInfo, Subject, SyllabusDto, SyllabusDocument, Topic } from "../../types";

const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE_MB = 20;

function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "Unsupported file type. Please choose a PDF, Word document (.doc/.docx), or an image (JPG/PNG/WebP).";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large — please keep it under ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

function describeFailedFiles(failed: { filename: string; reason: string }[]): string {
  return `${failed.length} file(s) could not be read: ` + failed.map((f) => `${f.filename} (${f.reason})`).join("; ");
}

export function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [syllabi, setSyllabi] = useState<SyllabusDto[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<number | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMySubjects()
      .then((subs) => {
        setSubjects(subs);
        if (subs.length > 0) setSubjectId(subs[0].id);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    setError(null);
    syllabusApi
      .listSyllabi(subjectId)
      .then((list) => {
        setSyllabi(list);
        if (list.length > 0) {
          setSelectedSyllabusId(list[list.length - 1].id);
          setCreatingNew(false);
        } else {
          setSelectedSyllabusId(null);
          setCreatingNew(true);
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, [subjectId]);

  async function refreshSyllabi(selectId?: number) {
    if (!subjectId) return;
    const list = await syllabusApi.listSyllabi(subjectId);
    setSyllabi(list);
    if (selectId) {
      setSelectedSyllabusId(selectId);
      setCreatingNew(false);
    }
  }

  function updateSyllabusInList(updated: SyllabusDto) {
    setSyllabi((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  const selectedSyllabus = syllabi.find((s) => s.id === selectedSyllabusId) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Syllabus & Pacing"
        description="Upload your syllabus, review what was extracted, confirm it, then plan your weeks/months."
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
          <div className="mb-5 flex items-center gap-3">
            <SubjectSelect subjects={subjects} value={subjectId} onChange={setSubjectId} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-3">
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setCreatingNew(true)}>
                <PlusIcon className="h-4 w-4" /> New Syllabus
              </Button>

              {syllabi.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Syllabus versions</h3>
                  </CardHeader>
                  <CardBody className="space-y-1">
                    {syllabi.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSyllabusId(s.id);
                          setCreatingNew(false);
                        }}
                        className={clsx(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                          !creatingNew && s.id === selectedSyllabusId
                            ? "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                        )}
                      >
                        <span>{s.term}</span>
                        <span className="flex items-center gap-1">
                          {s.confirmed ? (
                            <CheckCircleIcon className="h-4 w-4 text-teal-500" title="Confirmed" />
                          ) : (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                              Draft
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              {creatingNew ? (
                <NewSyllabusForm
                  subjectId={subjectId}
                  existingSyllabi={syllabi}
                  onCreated={(id) => refreshSyllabi(id)}
                  onCancel={() => setCreatingNew(false)}
                />
              ) : selectedSyllabus ? (
                <SyllabusWorkspace
                  key={selectedSyllabus.id}
                  syllabus={selectedSyllabus}
                  onSyllabusChange={updateSyllabusInList}
                />
              ) : (
                <EmptyState title="No syllabus yet" description='Click "New Syllabus" on the left to get started.' />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MultiFileDropzone({ onFilesSelected }: { onFilesSelected: (files: File[]) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40 dark:border-white/15 dark:bg-white/5 dark:hover:border-brand-400/60 dark:hover:bg-brand-500/10">
      <CloudArrowUpIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      <span className="text-sm text-slate-600 dark:text-slate-300">Click to choose file(s) — PDF, Word, or a photo/scan</span>
      <span className="text-xs text-slate-400 dark:text-slate-500">You can select multiple files at once</span>
      <input
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFilesSelected(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function NewSyllabusForm({
  subjectId,
  existingSyllabi,
  onCreated,
  onCancel,
}: {
  subjectId: number | null;
  existingSyllabi: SyllabusDto[];
  onCreated: (syllabusId: number) => void;
  onCancel: () => void;
}) {
  const [term, setTerm] = useState("Term 1, 2026");
  const [termStartDate, setTermStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [cloneFromId, setCloneFromId] = useState<number | "">("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function addFiles(newFiles: File[]) {
    const valid: File[] = [];
    for (const f of newFiles) {
      const err = validateFile(f);
      if (err) {
        setError(err);
        continue;
      }
      valid.push(f);
    }
    if (valid.length) setError(null);
    setFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const hasContent = files.length > 0 || !!manualText.trim() || !!cloneFromId;

  async function handleSubmit() {
    if (!subjectId || !hasContent) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await syllabusApi.createSyllabus({
        subjectId,
        term,
        termStartDate,
        files,
        manualText,
        cloneFromSyllabusId: cloneFromId ? Number(cloneFromId) : undefined,
        onProgress: setProgress,
      });
      if (result.failedFiles.length > 0) {
        setError(describeFailedFiles(result.failedFiles));
      }
      onCreated(result.syllabus.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">New syllabus</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardBody className="space-y-3">
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Term">
          <TextInput value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Term 1, 2026" />
        </Field>
        <Field label="Term start date" hint="Used to map Week 1, Week 2... to real calendar dates">
          <TextInput type="date" value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} />
        </Field>

        {existingSyllabi.length > 0 && (
          <Field
            label="Clone topics from a previous term (optional)"
            hint="Copies that term's topics into this draft, with dates shifted to match the new start date above."
          >
            <Select
              value={cloneFromId}
              onChange={(e) => setCloneFromId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Don't clone — start from scratch</option>
              {existingSyllabi.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.term}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Syllabus files" hint="PDF, Word (.doc/.docx), or a photo/scan (JPG, PNG, WebP) — one or more">
          <MultiFileDropzone onFilesSelected={addFiles} />
        </Field>

        {files.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-white/[0.08] dark:border-white/10">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="truncate">{f.name}</span>
                <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-coral-600 dark:text-slate-500 dark:hover:text-coral-400">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!showManual ? (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <PencilIcon className="h-3.5 w-3.5" /> Or type it manually instead — recommended for poor-quality scans (e.g. Urdu)
          </button>
        ) : (
          <Field label="Syllabus text (typed manually)" hint="Best option right now for low-quality or Urdu scans.">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={8}
              placeholder="Type or paste the syllabus content here..."
              className="block w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
            />
          </Field>
        )}

        {uploading && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit} loading={uploading} disabled={!hasContent}>
          {uploading
            ? `Uploading ${progress}%`
            : files.length > 0
            ? `Upload ${files.length} file(s)`
            : cloneFromId
            ? "Create syllabus (clone topics)"
            : "Create syllabus"}
        </Button>
      </CardBody>
    </Card>
  );
}

type WorkspaceTab = "syllabus" | "planning";

function SyllabusWorkspace({
  syllabus,
  onSyllabusChange,
}: {
  syllabus: SyllabusDto;
  onSyllabusChange: (s: SyllabusDto) => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>(syllabus.confirmed ? "planning" : "syllabus");
  const [documents, setDocuments] = useState<SyllabusDocument[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [editingTerm, setEditingTerm] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);

  useEffect(() => {
    setDocsLoading(true);
    syllabusApi
      .listDocuments(syllabus.id)
      .then(setDocuments)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setDocsLoading(false));
    syllabusApi.listTopics(syllabus.id).then(setTopics).catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllabus.id]);

  function handlePlanningClick() {
    if (!syllabus.confirmed) {
      setError('Please confirm the syllabus content in the "Syllabus" tab first.');
      return;
    }
    setError(null);
    setTab("planning");
  }

  async function handleConfirm() {
    const updated = await syllabusApi.confirmSyllabus(syllabus.id);
    onSyllabusChange(updated);
    setError(null);
    setTab("planning");
  }

  async function handleUnconfirm() {
    const updated = await syllabusApi.unconfirmSyllabus(syllabus.id);
    onSyllabusChange(updated);
    setError(null);
    setTab("syllabus");
  }

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setWarning(null);
    try {
      const { data, message } = await syllabusApi.extractTopics(syllabus.id);
      setTopics(data);
      setWarning(message);
      onSyllabusChange({ ...syllabus, hasExtractedTopics: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveTerm(newTerm: string, newStartDate: string) {
    setSavingTerm(true);
    setError(null);
    try {
      const updated = await syllabusApi.updateSyllabus(syllabus.id, newTerm, newStartDate);
      onSyllabusChange(updated);
      setEditingTerm(false);

      const oldStart = new Date(syllabus.termStartDate).getTime();
      const newStart = new Date(newStartDate).getTime();
      const deltaDays = Math.round((newStart - oldStart) / 86_400_000);
      if (deltaDays !== 0 && topics.length > 0) {
        const shift = confirm(
          `Term start date changed by ${deltaDays > 0 ? "+" : ""}${deltaDays} day(s). Shift all ${topics.length} topic date(s) by the same amount to match?`
        );
        if (shift) {
          await syllabusApi.shiftTopicDates(syllabus.id, deltaDays);
          setTopics(await syllabusApi.listTopics(syllabus.id));
        }
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingTerm(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{syllabus.term}</span>
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">starts {formatDate(syllabus.termStartDate)}</span>
        </div>
        <button
          onClick={() => setEditingTerm(true)}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
        >
          <PencilIcon className="h-3.5 w-3.5" /> Edit term
        </button>
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-white/10">
        <TabButton active={tab === "syllabus"} onClick={() => setTab("syllabus")}>
          Syllabus
        </TabButton>
        <TabButton active={tab === "planning"} locked={!syllabus.confirmed} onClick={handlePlanningClick}>
          Planning
        </TabButton>
      </div>

      {editingTerm && (
        <EditTermModal
          initialTerm={syllabus.term}
          initialStartDate={syllabus.termStartDate}
          saving={savingTerm}
          onCancel={() => setEditingTerm(false)}
          onSave={handleSaveTerm}
        />
      )}

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {warning && (
        <div className="mb-4">
          <Alert type="warning">{warning}</Alert>
        </div>
      )}

      {tab === "syllabus" ? (
        <DocumentsPanel
          syllabus={syllabus}
          documents={documents}
          hasTopics={topics.length > 0}
          loading={docsLoading}
          onDocumentsChange={setDocuments}
          onConfirm={handleConfirm}
          onUnconfirm={handleUnconfirm}
          onError={(e) => setError(errorMessage(e))}
        />
      ) : (
        <TopicsPanel
          syllabus={syllabus}
          topics={topics}
          onExtract={handleExtract}
          extracting={extracting}
          onTopicsChange={setTopics}
          onError={(e) => setError(errorMessage(e))}
        />
      )}
    </div>
  );
}

function EditTermModal({
  initialTerm,
  initialStartDate,
  saving,
  onCancel,
  onSave,
}: {
  initialTerm: string;
  initialStartDate: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (term: string, startDate: string) => void;
}) {
  const [term, setTerm] = useState(initialTerm);
  const [startDate, setStartDate] = useState(initialStartDate);

  return (
    <Modal open onClose={onCancel} title="Edit term" widthClass="max-w-sm">
      <div className="space-y-3">
        <Field label="Term">
          <TextInput value={term} onChange={(e) => setTerm(e.target.value)} />
        </Field>
        <Field label="Term start date" hint="If you change this, you'll be offered a one-click shift for all topic dates too.">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(term, startDate)} loading={saving} disabled={!term.trim() || !startDate}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TabButton({
  active,
  locked,
  onClick,
  children,
}: {
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {locked && <LockClosedIcon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function DocumentsPanel({
  syllabus,
  documents,
  hasTopics,
  loading,
  onDocumentsChange,
  onConfirm,
  onUnconfirm,
  onError,
}: {
  syllabus: SyllabusDto;
  documents: SyllabusDocument[];
  hasTopics: boolean;
  loading: boolean;
  onDocumentsChange: (docs: SyllabusDocument[]) => void;
  onConfirm: () => Promise<void>;
  onUnconfirm: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [unconfirming, setUnconfirming] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  async function handleSaveText(documentId: number, text: string) {
    try {
      const updated = await syllabusApi.updateDocumentText(documentId, text);
      onDocumentsChange(documents.map((d) => (d.id === documentId ? updated : d)));
    } catch (e) {
      onError(e);
    }
  }

  async function handleDelete(documentId: number) {
    if (!confirm("Remove this document from the syllabus?")) return;
    try {
      await syllabusApi.deleteDocument(documentId);
      onDocumentsChange(documents.filter((d) => d.id !== documentId));
    } catch (e) {
      onError(e);
    }
  }

  async function handleAddFiles(files: File[]) {
    try {
      const result = await syllabusApi.addDocuments(syllabus.id, files);
      onDocumentsChange([...documents, ...result.documents]);
      if (result.failedFiles.length > 0) {
        onError(new Error(describeFailedFiles(result.failedFiles)));
      }
    } catch (e) {
      onError(e);
    }
  }

  async function handleAddManualText() {
    if (!manualText.trim()) return;
    setAddingManual(true);
    try {
      const result = await syllabusApi.addDocuments(syllabus.id, [], manualText);
      onDocumentsChange([...documents, ...result.documents]);
      setManualText("");
      setShowManual(false);
    } catch (e) {
      onError(e);
    } finally {
      setAddingManual(false);
    }
  }

  async function handleConfirmClick() {
    setConfirming(true);
    try {
      await onConfirm();
    } catch (e) {
      onError(e);
    } finally {
      setConfirming(false);
    }
  }

  async function handleUnconfirmClick() {
    setUnconfirming(true);
    try {
      await onUnconfirm();
    } catch (e) {
      onError(e);
    } finally {
      setUnconfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {syllabus.confirmed && (
        <Card className="border-teal-200 bg-teal-50 dark:border-teal-500/20 dark:bg-teal-500/10">
          <CardBody className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-300">
              <CheckCircleIcon className="h-5 w-5" />
              Confirmed{syllabus.confirmedAt ? ` on ${new Date(syllabus.confirmedAt).toLocaleDateString()}` : ""}
            </span>
            <Button size="sm" variant="secondary" onClick={handleUnconfirmClick} loading={unconfirming}>
              Edit again
            </Button>
          </CardBody>
        </Card>
      )}

      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description={
            hasTopics
              ? "This draft has cloned topics but no uploaded files yet — that's fine, you can confirm and plan directly, or add source files below."
              : "Upload one or more files below to get started."
          }
        />
      ) : (
        documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            readOnly={syllabus.confirmed}
            onSave={(text) => handleSaveText(doc.id, text)}
            onDelete={() => handleDelete(doc.id)}
          />
        ))
      )}

      {!syllabus.confirmed && (
        <>
          <MultiFileDropzone onFilesSelected={handleAddFiles} />

          {!showManual ? (
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <PencilIcon className="h-3.5 w-3.5" /> Or type it manually instead
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-slate-100 p-3 dark:border-white/10">
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={6}
                placeholder="Type or paste syllabus content here..."
                className="block w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setShowManual(false); setManualText(""); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddManualText} loading={addingManual} disabled={!manualText.trim()}>
                  Add typed text
                </Button>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleConfirmClick} loading={confirming} disabled={documents.length === 0 && !hasTopics}>
            Confirm Syllabus
          </Button>
        </>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence, isManual }: { confidence: number | null; isManual: boolean }) {
  if (isManual) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">
        Typed text
      </span>
    );
  }
  if (confidence == null) return null;
  const rounded = Math.round(confidence);
  const colorClass =
    confidence >= 85
      ? "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
      : confidence >= 65
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
      : "bg-coral-100 text-coral-700 dark:bg-coral-500/15 dark:text-coral-300";
  return <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", colorClass)}>{rounded}% confidence</span>;
}

function DocumentPreviewPane({ documentId }: { documentId: number }) {
  const [info, setInfo] = useState<DocumentPreviewInfo | null>(null);
  const [page, setPage] = useState(1);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    syllabusApi
      .getPreviewInfo(documentId)
      .then((i) => {
        if (!alive) return;
        setInfo(i);
        setPage(1);
      })
      .catch(() => {
        if (alive) setInfo({ type: "NONE", pageCount: 0 });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [documentId]);

  useEffect(() => {
    if (!info || info.type === "NONE") return;
    let alive = true;
    let objectUrl: string | null = null;
    syllabusApi.getPreviewImageUrl(documentId, page).then((url) => {
      if (!alive) {
        URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setImgUrl(url);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [info, documentId, page]);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!info || info.type === "NONE") {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/5 dark:text-slate-500">
        Preview not available for this file type — use the extracted text.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {imgUrl ? (
        <img
          src={imgUrl}
          alt="Original scan"
          className="max-h-72 w-full rounded-lg border border-slate-200 object-contain dark:border-white/10"
        />
      ) : (
        <div className="flex h-56 w-full items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5">
          <Spinner className="h-5 w-5" />
        </div>
      )}
      {info.type === "PDF" && info.pageCount > 1 && (
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
          </button>
          Page {page} of {info.pageCount}
          <button disabled={page >= info.pageCount} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  document,
  readOnly,
  onSave,
  onDelete,
}: {
  document: SyllabusDocument;
  readOnly: boolean;
  onSave: (text: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [text, setText] = useState(document.extractedText);
  const [saving, setSaving] = useState(false);
  const dirty = text !== document.extractedText;

  const isManual = document.contentType === null && document.ocrConfidence === null;
  const lowQuality =
    document.ocrConfidence != null && (document.ocrConfidence < 65 || (document.ocrLanguage ?? "").includes("urd"));

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <DocumentIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          {document.originalFilename}
          <ConfidenceBadge confidence={document.ocrConfidence} isManual={isManual} />
        </span>
        {!readOnly && (
          <button onClick={onDelete} className="text-slate-400 hover:text-coral-600 dark:text-slate-500 dark:hover:text-coral-400">
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardBody className="space-y-3">
        {document.lowConfidenceWords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Check:</span>
            {document.lowConfidenceWords.map((w, i) => (
              <span key={i} className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {w}
              </span>
            ))}
          </div>
        )}

        {lowQuality && !readOnly && (
          <Alert type="warning">
            Extraction quality looks low{(document.ocrLanguage ?? "").includes("urd") ? " for this Urdu scan" : ""} — try a
            clearer, flatter, well-lit scan, or{" "}
            <button type="button" className="font-semibold underline" onClick={() => setText("")}>
              switch to Manual Entry
            </button>
            .
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DocumentPreviewPane documentId={document.id} />
          <div>
            {readOnly ? (
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {document.extractedText}
              </pre>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  className="block w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
                />
                {dirty && (
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={handleSave} loading={saving}>
                      Save changes
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function TopicsPanel({
  syllabus,
  topics,
  onExtract,
  extracting,
  onTopicsChange,
  onError,
}: {
  syllabus: SyllabusDto;
  topics: Topic[];
  onExtract: () => void;
  extracting: boolean;
  onTopicsChange: (topics: Topic[]) => void;
  onError: (e: unknown) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [shiftDays, setShiftDays] = useState("");
  const [applyingShift, setApplyingShift] = useState(false);

  async function handleApplyShift() {
    const days = parseInt(shiftDays, 10);
    if (!days || Number.isNaN(days)) return;
    setApplyingShift(true);
    try {
      await syllabusApi.shiftTopicDates(syllabus.id, days);
      onTopicsChange(await syllabusApi.listTopics(syllabus.id));
      setShifting(false);
      setShiftDays("");
    } catch (e) {
      onError(e);
    } finally {
      setApplyingShift(false);
    }
  }

  async function handleDelete(topicId: number) {
    if (!confirm("Remove this topic? Any related lesson-plan history will also be removed.")) return;
    try {
      await syllabusApi.deleteTopic(topicId);
      onTopicsChange(topics.filter((t) => t.id !== topicId));
    } catch (e) {
      onError(e);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= topics.length) return;
    const reordered = [...topics];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    onTopicsChange(reordered);
    try {
      const saved = await syllabusApi.reorderTopics(syllabus.id, reordered.map((t) => t.id));
      onTopicsChange(saved);
    } catch (e) {
      onError(e);
    }
  }

  async function handleSaveEdit(topicId: number, values: TopicFormValues) {
    try {
      const updated = await syllabusApi.updateTopic(topicId, values);
      onTopicsChange(topics.map((t) => (t.id === topicId ? updated : t)));
    } catch (e) {
      onError(e);
    }
  }

  async function handleAdd(values: TopicFormValues) {
    try {
      const created = await syllabusApi.createTopic(syllabus.id, values);
      onTopicsChange([...topics, created]);
      setAdding(false);
    } catch (e) {
      onError(e);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{syllabus.term} &mdash; Topics</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {topics.filter((t) => t.covered).length} of {topics.length} topics covered
          </p>
        </div>
        <div className="flex items-center gap-2">
          {topics.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShifting((v) => !v)}>
              <ArrowsRightLeftIcon className="h-4 w-4" /> Shift dates
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <PlusIcon className="h-4 w-4" /> Add topic
          </Button>
          <Button size="sm" onClick={onExtract} loading={extracting}>
            <SparklesIcon className="h-4 w-4" /> {topics.length > 0 ? "Re-extract with AI" : "Extract with AI"}
          </Button>
        </div>
      </CardHeader>
      {shifting && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Shift every topic's dates by</span>
          <TextInput
            type="number"
            value={shiftDays}
            onChange={(e) => setShiftDays(e.target.value)}
            className="w-20"
            placeholder="e.g. 7"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">day(s) (negative to pull earlier)</span>
          <Button size="sm" onClick={handleApplyShift} loading={applyingShift} disabled={!shiftDays}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShifting(false)}>
            Cancel
          </Button>
        </div>
      )}
      <CardBody>
        {topics.length === 0 && !adding ? (
          <EmptyState
            title="No topics yet"
            description='Click "Extract with AI" to auto-generate topics from your confirmed syllabus text, or add one manually.'
          />
        ) : (
          <div className="space-y-2">
            {adding && (
              <TopicForm
                onCancel={() => setAdding(false)}
                onSave={handleAdd}
                defaultStart={syllabus.termStartDate}
              />
            )}
            {topics.map((topic, index) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                index={index}
                total={topics.length}
                onMove={handleMove}
                onDelete={() => handleDelete(topic.id)}
                onSave={(values) => handleSaveEdit(topic.id, values)}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

interface TopicFormValues {
  title: string;
  startWeek?: number;
  endWeek?: number;
  plannedStartDate: string;
  plannedEndDate: string;
}

function TopicRow({
  topic,
  index,
  total,
  onMove,
  onDelete,
  onSave,
}: {
  topic: Topic;
  index: number;
  total: number;
  onMove: (index: number, dir: -1 | 1) => void;
  onDelete: () => void;
  onSave: (values: TopicFormValues) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TopicForm
        initial={topic}
        onCancel={() => setEditing(false)}
        onSave={(values) => {
          onSave(values);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-transparent px-2.5 py-3 transition-colors hover:border-slate-200/70 hover:bg-slate-50/70 dark:hover:border-white/10 dark:hover:bg-white/5">
      <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
        <button
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          className="px-1.5 py-1 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-500 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
          aria-label="Move up"
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <div className="h-px bg-slate-200 dark:bg-white/10" />
        <button
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          className="px-1.5 py-1 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-500 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
          aria-label="Move down"
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold leading-snug text-navy-900 dark:text-slate-100">{topic.title}</span>
          {topic.covered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
              <CheckCircleIcon className="h-3 w-3" /> Covered
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <DateRangeChip start={topic.plannedStartDate} end={topic.plannedEndDate} />
          {topic.startWeek && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              Week {topic.startWeek}
              {topic.endWeek !== topic.startWeek ? `–${topic.endWeek}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
          aria-label="Edit topic"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-coral-50 hover:text-coral-600 dark:text-slate-500 dark:hover:bg-coral-500/15 dark:hover:text-coral-400"
          aria-label="Delete topic"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TopicForm({
  initial,
  defaultStart,
  onCancel,
  onSave,
}: {
  initial?: Topic;
  defaultStart?: string;
  onCancel: () => void;
  onSave: (values: TopicFormValues) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [plannedStartDate, setPlannedStartDate] = useState(initial?.plannedStartDate ?? defaultStart ?? "");
  const [plannedEndDate, setPlannedEndDate] = useState(initial?.plannedEndDate ?? defaultStart ?? "");

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-white/5 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions" autoFocus />
        </Field>
      </div>
      <Field label="Start date">
        <TextInput type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
      </Field>
      <Field label="End date">
        <TextInput type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
      </Field>
      <div className="col-span-full flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!title || !plannedStartDate || !plannedEndDate}
          onClick={() => onSave({ title, plannedStartDate, plannedEndDate })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
