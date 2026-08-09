import clsx from "clsx";
import type { ReactNode } from "react";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

export function Alert({ type = "error", children }: { type?: "error" | "success"; children: ReactNode }) {
  const isError = type === "error";
  return (
    <div
      className={clsx(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        isError ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
      )}
    >
      {isError ? (
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      ) : (
        <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
