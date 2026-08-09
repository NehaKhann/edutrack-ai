import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
  PlusIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  DocumentIcon,
  XMarkIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { SubjectSelect } from "../../components/SubjectSelect";
import { Card, CardBody, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Field, TextInput } from "../../components/FormFields";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { getMySubjects } from "../../api/subjects";
import * as syllabusApi from "../../api/syllabus";
import { errorMessage } from "../../api/client";
import type { Subject, SyllabusDto, SyllabusDocument, Topic } from "../../types";

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
                    <h3 className="text-sm font-semibold text-slate-800">Syllabus versions</h3>
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
                            ? "bg-brand-50 text-brand-800"
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span>{s.term}</span>
                        <span className="flex items-center gap-1">
                          {s.confirmed ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" title="Confirmed" />
                          ) : (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
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
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40">
      <CloudArrowUpIcon className="h-6 w-6 text-slate-400" />
      <span className="text-sm text-slate-600">Click to choose file(s) — PDF, Word, or a photo/scan</span>
      <span className="text-xs text-slate-400">You can select multiple files at once</span>
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
  onCreated,
  onCancel,
}: {
  subjectId: number | null;
  onCreated: (syllabusId: number) => void;
  onCancel: () => void;
}) {
  const [term, setTerm] = useState("Term 1, 2026");
  const [termStartDate, setTermStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
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

  async function handleSubmit() {
    if (!subjectId || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await syllabusApi.createSyllabus({ subjectId, term, termStartDate, files, onProgress: setProgress });
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
        <h3 className="text-sm font-semibold text-slate-800">New syllabus</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
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
        <Field label="Syllabus files" hint="PDF, Word (.doc/.docx), or a photo/scan (JPG, PNG, WebP) — one or more">
          <MultiFileDropzone onFilesSelected={addFiles} />
        </Field>

        {files.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{f.name}</span>
                <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit} loading={uploading} disabled={files.length === 0}>
          {uploading ? `Uploading ${progress}%` : `Upload ${files.length > 0 ? files.length : ""} file(s)`}
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

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "syllabus"} onClick={() => setTab("syllabus")}>
          Syllabus
        </TabButton>
        <TabButton active={tab === "planning"} locked={!syllabus.confirmed} onClick={handlePlanningClick}>
          Planning
        </TabButton>
      </div>

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
        active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
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
  loading,
  onDocumentsChange,
  onConfirm,
  onUnconfirm,
  onError,
}: {
  syllabus: SyllabusDto;
  documents: SyllabusDocument[];
  loading: boolean;
  onDocumentsChange: (docs: SyllabusDocument[]) => void;
  onConfirm: () => Promise<void>;
  onUnconfirm: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [unconfirming, setUnconfirming] = useState(false);

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
        <Card className="border-green-200 bg-green-50">
          <CardBody className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-green-800">
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
        <EmptyState title="No documents yet" description="Upload one or more files below to get started." />
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
          <Button className="w-full" onClick={handleConfirmClick} loading={confirming} disabled={documents.length === 0}>
            Confirm Syllabus
          </Button>
        </>
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
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <DocumentIcon className="h-4 w-4 text-slate-400" />
          {document.originalFilename}
        </span>
        {!readOnly && (
          <button onClick={onDelete} className="text-slate-400 hover:text-red-600">
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardBody>
        {readOnly ? (
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
            {document.extractedText}
          </pre>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
          <h3 className="text-sm font-semibold text-slate-800">{syllabus.term} &mdash; Topics</h3>
          <p className="text-xs text-slate-500">
            {topics.filter((t) => t.covered).length} of {topics.length} topics covered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <PlusIcon className="h-4 w-4" /> Add topic
          </Button>
          <Button size="sm" onClick={onExtract} loading={extracting}>
            <SparklesIcon className="h-4 w-4" /> {topics.length > 0 ? "Re-extract with AI" : "Extract with AI"}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {topics.length === 0 && !adding ? (
          <EmptyState
            title="No topics yet"
            description='Click "Extract with AI" to auto-generate topics from your confirmed syllabus text, or add one manually.'
          />
        ) : (
          <div className="divide-y divide-slate-100">
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
    <div className="flex items-center gap-3 py-3">
      <div className="flex flex-col">
        <button
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{topic.title}</span>
          {topic.covered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              <CheckCircleIcon className="h-3 w-3" /> Covered
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {topic.plannedStartDate} &rarr; {topic.plannedEndDate}
          {topic.startWeek && <span> &middot; Week {topic.startWeek}{topic.endWeek !== topic.startWeek ? `–${topic.endWeek}` : ""}</span>}
        </div>
      </div>

      <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-brand-600">
        <PencilSquareIcon className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="text-slate-400 hover:text-red-600">
        <TrashIcon className="h-4 w-4" />
      </button>
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
    <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
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
