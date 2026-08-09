import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "green" | "blue" | "red" | "amber" | "gray" | "indigo";

const toneClasses: Record<Tone, string> = {
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-100 text-indigo-800",
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
