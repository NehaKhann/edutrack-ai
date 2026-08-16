import clsx from "clsx";
import type { ReactNode } from "react";
import { ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";

type AlertType = "error" | "success" | "warning";

const toneClasses: Record<AlertType, string> = {
  error: "border-coral-100 bg-coral-50 text-coral-700 dark:border-coral-500/20 dark:bg-coral-500/10 dark:text-coral-300",
  success: "border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
};

const dismissClasses: Record<AlertType, string> = {
  error: "hover:bg-coral-100 dark:hover:bg-coral-500/20",
  success: "hover:bg-teal-100 dark:hover:bg-teal-500/20",
  warning: "hover:bg-amber-100 dark:hover:bg-amber-500/20",
};

export function Alert({
  type = "error",
  children,
  onClose,
}: {
  type?: AlertType;
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className={clsx("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-sm", toneClasses[type])}>
      {type === "success" ? (
        <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      ) : (
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      )}
      <span className="flex-1">{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className={clsx("-m-1 shrink-0 rounded-full p-1 transition-colors", dismissClasses[type])}
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
