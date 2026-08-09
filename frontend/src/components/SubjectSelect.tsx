import type { Subject } from "../types";
import { Select } from "./FormFields";

export function SubjectSelect({
  subjects,
  value,
  onChange,
}: {
  subjects: Subject[];
  value: number | null;
  onChange: (subjectId: number) => void;
}) {
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className="max-w-xs">
      <option value="" disabled>
        Select a subject...
      </option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} — {s.classSectionName}
        </option>
      ))}
    </Select>
  );
}
