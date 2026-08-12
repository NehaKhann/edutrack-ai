import clsx from "clsx";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { ResponsiveTable } from "./ResponsiveTable";
import { PERIODS, WEEKDAYS, WEEKDAY_SHORT, cellKey, type TimetableEntry, type Weekday } from "../types/timetable";

const TODAY_WEEKDAY: Weekday | null = (() => {
  const map: Weekday[] = ["SUNDAY" as Weekday, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY" as Weekday];
  const name = map[new Date().getDay()];
  return WEEKDAYS.includes(name) ? name : null;
})();

export function TimetableGrid({
  entries,
  mode,
  editable = false,
  onCellClick,
}: {
  entries: TimetableEntry[];
  mode: "class" | "teacher";
  editable?: boolean;
  onCellClick?: (day: Weekday, period: number, entry: TimetableEntry | undefined) => void;
}) {
  const byCell = new Map<string, TimetableEntry[]>();
  for (const e of entries) {
    const key = cellKey(e.dayOfWeek, e.period);
    const list = byCell.get(key);
    if (list) list.push(e);
    else byCell.set(key, [e]);
  }

  return (
    <ResponsiveTable>
      <table className="w-full min-w-[760px] border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th className="w-24 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Day
            </th>
            {PERIODS.map((p) => (
              <th
                key={p}
                className="px-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
              >
                P{p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day) => (
            <tr key={day}>
              <td
                className={clsx(
                  "rounded-lg px-2.5 py-2 text-xs font-semibold",
                  day === TODAY_WEEKDAY
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-slate-600 dark:text-slate-300"
                )}
              >
                {WEEKDAY_SHORT[day]}
              </td>
              {PERIODS.map((period) => {
                const cellEntries = byCell.get(cellKey(day, period)) ?? [];
                const hasClash = cellEntries.length > 1;
                const entry = cellEntries[0];
                const secondary = mode === "class" ? entry?.teacherName : entry?.classSectionName;
                return (
                  <td key={period} className="p-0">
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => onCellClick?.(day, period, entry)}
                      title={
                        hasClash
                          ? cellEntries.map((e) => `${e.subjectName} — ${mode === "class" ? e.teacherName : e.classSectionName}`).join(" / ")
                          : entry
                            ? `${entry.subjectName} — ${secondary ?? ""}`
                            : editable
                              ? "Click to assign"
                              : undefined
                      }
                      className={clsx(
                        "flex h-16 w-full min-w-[84px] flex-col items-start justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-left transition-colors",
                        hasClash
                          ? "border-coral-200 bg-coral-50/80 dark:border-coral-500/30 dark:bg-coral-500/[0.08]"
                          : entry
                            ? "border-brand-100 bg-brand-50/70 dark:border-brand-500/20 dark:bg-brand-500/[0.08]"
                            : "border-dashed border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]",
                        editable && "cursor-pointer hover:border-brand-300 hover:shadow-sm dark:hover:border-brand-400/40",
                        !editable && "cursor-default"
                      )}
                    >
                      {hasClash ? (
                        <>
                          <span className="flex w-full items-center gap-1 truncate text-xs font-semibold text-coral-700 dark:text-coral-300">
                            <ExclamationTriangleIcon className="h-3 w-3 shrink-0" /> {cellEntries.length} classes
                          </span>
                          <span className="w-full truncate text-[11px] text-coral-600 dark:text-coral-400">
                            {cellEntries.map((e) => e.classSectionName).join(", ")}
                          </span>
                        </>
                      ) : entry ? (
                        <>
                          <span className="w-full truncate text-xs font-semibold text-navy-900 dark:text-slate-100">
                            {entry.subjectName}
                          </span>
                          <span className="w-full truncate text-[11px] text-slate-500 dark:text-slate-400">{secondary}</span>
                        </>
                      ) : (
                        editable && <span className="text-[11px] text-slate-300 dark:text-slate-600">+ Add</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}
