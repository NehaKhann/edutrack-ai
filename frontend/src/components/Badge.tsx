import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "green" | "blue" | "red" | "amber" | "gray" | "indigo";

const toneClasses: Record<Tone, string> = {
  green: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
  blue: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20",
  red: "bg-coral-50 text-coral-700 ring-1 ring-inset ring-coral-100 dark:bg-coral-500/10 dark:text-coral-300 dark:ring-coral-500/20",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  gray: "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300",
  indigo: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}

const statusToneMap: Record<string, Tone> = {
  ON_TRACK: "green",
  AHEAD: "blue",
  BEHIND: "red",
  NOT_STARTED: "gray",
  PLANNED: "gray",
  COVERED: "green",
  MISSED: "red",
  RESCHEDULED: "amber",
};

const statusLabelMap: Record<string, string> = {
  ON_TRACK: "On track",
  AHEAD: "Ahead",
  BEHIND: "Behind",
  NOT_STARTED: "Not started",
  PLANNED: "Planned",
  COVERED: "Covered",
  MISSED: "Missed",
  RESCHEDULED: "Rescheduled",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusToneMap[status] ?? "gray"}>{statusLabelMap[status] ?? status}</Badge>;
}
