import type { ReactNode } from "react";
import clsx from "clsx";
import { Card, CardBody } from "./Card";

type Tone = "default" | "teal" | "coral" | "amber" | "brand";

const toneClasses: Record<Tone, string> = {
  default: "text-slate-900 dark:text-slate-100",
  teal: "text-teal-600 dark:text-teal-400",
  coral: "text-coral-600 dark:text-coral-400",
  amber: "text-amber-600 dark:text-amber-400",
  brand: "text-brand-600 dark:text-brand-400",
};

export function StatCard({ icon, label, value, tone = "default" }: { icon?: ReactNode; label: string; value: ReactNode; tone?: Tone }) {
  return (
    <Card>
      <CardBody>
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {icon}
          {label}
        </p>
        <p className={clsx("mt-1.5 text-2xl font-bold tabular-nums", toneClasses[tone])}>{value}</p>
      </CardBody>
    </Card>
  );
}
