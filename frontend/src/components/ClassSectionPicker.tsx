import { useMemo } from "react";
import { Field, Select } from "./FormFields";
import type { ClassSectionSummary } from "../types/roster";

export function ClassSectionPicker({
  classSections,
  value,
  onChange,
  classLabel = "Class",
  sectionLabel = "Section",
  selectClassName = "w-44",
  containerClassName = "flex flex-wrap gap-3",
}: {
  classSections: ClassSectionSummary[];
  value: number | null;
  onChange: (id: number) => void;
  classLabel?: string;
  sectionLabel?: string;
  selectClassName?: string;
  containerClassName?: string;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, ClassSectionSummary[]>();
    for (const cs of classSections) {
      const list = map.get(cs.className) ?? [];
      list.push(cs);
      map.set(cs.className, list);
    }
    return map;
  }, [classSections]);

  if (classSections.length === 0) return null;

  const classNames = [...groups.keys()];
  const selected = classSections.find((cs) => cs.id === value);
  const selectedClassName = selected?.className ?? classNames[0];
  const sectionsInClass = groups.get(selectedClassName) ?? [];
  const showSectionPicker = sectionsInClass.length > 1 || sectionsInClass[0]?.sectionName != null;

  function handleClassChange(newClassName: string) {
    const first = groups.get(newClassName)?.[0];
    if (first) onChange(first.id);
  }

  return (
    <div className={containerClassName}>
      <Field label={classLabel}>
        <Select value={selectedClassName} onChange={(e) => handleClassChange(e.target.value)} className={selectClassName}>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>
              {cn}
            </option>
          ))}
        </Select>
      </Field>
      {showSectionPicker && (
        <Field label={sectionLabel}>
          <Select value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className={selectClassName}>
            {sectionsInClass.map((cs) => (
              <option key={cs.id} value={cs.id}>
                {cs.sectionName ?? "(No section)"}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  );
}
