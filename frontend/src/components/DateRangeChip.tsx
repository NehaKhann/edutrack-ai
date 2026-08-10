import clsx from "clsx";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { formatDateRange } from "../utils/date";

export function DateRangeChip({ start, end, className }: { start: string; end: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-600",
        "dark:bg-white/[0.08] dark:text-slate-300",
        className
      )}
    >
      <CalendarIcon className="h-3 w-3 flex-shrink-0 opacity-70" />
      {formatDateRange(start, end)}
    </span>
  );
}
