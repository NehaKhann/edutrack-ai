import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";

type ToastType = "success" | "error";

const toneClasses: Record<ToastType, string> = {
  success: "border-teal-200 bg-white text-teal-700 dark:border-teal-500/25 dark:bg-navy-800 dark:text-teal-300",
  error: "border-coral-200 bg-white text-coral-700 dark:border-coral-500/25 dark:bg-navy-800 dark:text-coral-300",
};

export function Toast({
  message,
  type = "success",
  onClose,
  duration = 2600,
  action,
}: {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
  action?: { label: string; onClick: () => void };
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4 sm:justify-end sm:px-6">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-glass ${toneClasses[type]}`}
          >
            {type === "success" ? <CheckCircleIcon className="h-5 w-5 shrink-0" /> : <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />}
            {message}
            {action && (
              <button
                type="button"
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className="ml-1 shrink-0 rounded-md px-1.5 py-0.5 text-sm font-bold underline underline-offset-2 hover:no-underline"
              >
                {action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
