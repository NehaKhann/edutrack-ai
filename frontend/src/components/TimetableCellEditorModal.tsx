import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field, Select } from "./FormFields";
import { errorMessage } from "../api/client";
import { WEEKDAY_LABELS, type Weekday } from "../types/timetable";

export interface CellEditorOption {
  subjectId: number;
  label: string;
}

export function TimetableCellEditorModal({
  open,
  onClose,
  day,
  period,
  currentSubjectId,
  options,
  emptyOptionsMessage,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  day: Weekday | null;
  period: number | null;
  currentSubjectId: number | null;
  options: CellEditorOption[];
  emptyOptionsMessage?: string;
  onSave: (subjectId: number | null) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(currentSubjectId != null ? String(currentSubjectId) : "");
      setError(null);
    }
  }, [open, currentSubjectId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(selected === "" ? null : Number(selected));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const title = day && period ? `${WEEKDAY_LABELS[day]} · Period ${period}` : "Edit period";

  return (
    <Modal open={open} onClose={onClose} title={title} widthClass="max-w-sm">
      <div className="space-y-4">
        {options.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {emptyOptionsMessage ?? "No subjects available to assign here yet."}
          </p>
        ) : (
          <Field label="Subject">
            <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">— Empty —</option>
              {options.map((opt) => (
                <option key={opt.subjectId} value={opt.subjectId}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {error && <p className="text-sm text-coral-600 dark:text-coral-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
