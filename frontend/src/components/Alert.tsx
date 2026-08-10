import clsx from "clsx";
import type { ReactNode } from "react";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

type AlertType = "error" | "success" | "warning";

const toneClasses: Record<AlertType, string> = {
  error: "border-coral-100 bg-coral-50 text-coral-700",
  success: "border-teal-100 bg-teal-50 text-teal-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export function Alert({ type = "error", children }: { type?: AlertType; children: ReactNode }) {
  return (
    <div className={clsx("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-sm", toneClasses[type])}>
      {type === "success" ? (
        <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      ) : (
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
