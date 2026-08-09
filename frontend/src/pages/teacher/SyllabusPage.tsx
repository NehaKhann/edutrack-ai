import { useEffect, useState } from "react";
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
import type { Subject, SyllabusDto, Topic } from "../../types";

export function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [syllabi, setSyllabi] = useState<SyllabusDto[]>([]);
  const [syllabusId, setSyllabusId] = useState<number | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

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
        setSyllabusId(list.length > 0 ? list[list.length - 1].id : null);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [subjectId]);

  useEffect(() => {
    if (!syllabusId) {
      setTopics([]);
      return;
    }
    syllabusApi.listTopics(syllabusId).then(setTopics).catch((e) => setError(errorMessage(e)));
  }, [syllabusId]);

  async function refreshSyllabi(selectNewestId?: number) {
    if (!subjectId) return;
    const list = await syllabusApi.listSyllabi(subjectId);
    setSyllabi(list);
    setSyllabusId(selectNewestId ?? (list.length > 0 ? list[list.length - 1].id : null));
  }

  async function handleExtract() {
    if (!syllabusId) return;
    setExtracting(true);
    setError(null);
    try {
      const extracted = await syllabusApi.extractTopics(syllabusId);
      setTopics(extracted);
      await refreshSyllabi(syllabusId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExtracting(false);
    }
  }

  const selectedSyllabus = syllabi.find((s) => s.id === syllabusId) ?? null;

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
        description="Upload a syllabus, let AI map it to weeks, then keep it editable as your source of truth."
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
            <div className="lg:col-span-1">
              <UploadCard subjectId={subjectId} onUploaded={(id) => refreshSyllabi(id)} />

              {syllabi.length > 0 && (
                <Card className="mt-5">
                  <CardHeader>
                    <h3 className="text-sm font-semibold text-slate-800">Syllabus versions</h3>
                  </CardHeader>
                  <CardBody className="space-y-1">
                    {syllabi.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSyllabusId(s.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                          s.id === syllabusId ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{s.term}</span>
                        {s.hasExtractedTopics && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                      </button>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              {!selectedSyllabus ? (
                <EmptyState
                  title="No syllabus uploaded yet"
                  description="Upload a syllabus PDF on the left to get started."
                />
              ) : (
                <TopicsPanel
                  syllabus={selectedSyllabus}
                  topics={topics}
                  onExtract={handleExtract}
                  extracting={extracting}
                  onTopicsChange={setTopics}
                  onError={(e) => setError(errorMessage(e))}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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

function UploadCard({ subjectId, onUploaded }: { subjectId: number | null; onUploaded: (id: number) => void }) {
  const [term, setTerm] = useState("Term 1, 2026");
  const [termStartDate, setTermStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(selected: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  async function handleSubmit() {
    if (!subjectId || !file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await syllabusApi.uploadSyllabus({ subjectId, term, termStartDate, file, onProgress: setProgress });
      onUploaded(result.id);
      handleFileSelect(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-800">Upload syllabus</h3>
      </CardHeader>
      <CardBody className="space-y-3">
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Term">
          <TextInput value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Term 1, 2026" />
        </Field>
        <Field label="Term start date" hint="Used to map Week 1, Week 2... to real calendar dates">
          <TextInput type="date" value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} />
        </Field>
        <Field label="Syllabus file" hint="PDF, Word (.doc/.docx), or a photo/scan (JPG, PNG, WebP)">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded-md object-cover" />
            ) : file ? (
              <DocumentIcon className="h-6 w-6 text-brand-500" />
            ) : (
              <CloudArrowUpIcon className="h-6 w-6 text-slate-400" />
            )}
            <span className="break-all text-sm text-slate-600">{file ? file.name : "Click to choose a file"}</span>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
        {uploading && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <Button className="w-full" onClick={handleSubmit} loading={uploading} disabled={!file || !subjectId}>
          {uploading ? `Uploading ${progress}%` : "Upload"}
        </Button>
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
            description='Click "Extract with AI" to auto-generate topics from the uploaded PDF, or add one manually.'
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
