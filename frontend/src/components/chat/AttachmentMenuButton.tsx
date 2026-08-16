import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { PaperClipIcon, PhotoIcon, CameraIcon, DocumentIcon } from "@heroicons/react/24/outline";
import { CameraCaptureModal } from "./CameraCaptureModal";

interface AttachOption {
  key: "gallery" | "camera" | "document";
  label: string;
  icon: typeof PhotoIcon;
  accept?: string;
  tone: string;
}

const OPTIONS: AttachOption[] = [
  { key: "gallery", label: "Photos & Videos", icon: PhotoIcon, accept: "image/*,video/*", tone: "bg-gradient-to-br from-teal-500 to-teal-600" },
  { key: "camera", label: "Camera", icon: CameraIcon, tone: "bg-gradient-to-br from-coral-500 to-coral-600" },
  { key: "document", label: "Document", icon: DocumentIcon, tone: "bg-gradient-to-br from-brand-500 to-brand-600" },
];

export function AttachmentMenuButton({ onPick, disabled }: { onPick: (file: File) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<{ bottom: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function updateRect() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ bottom: window.innerHeight - r.top, left: r.left });
    }
    updateRect();
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("resize", updateRect);
    document.addEventListener("mousedown", handlePointer);
    return () => {
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [open]);

  function chooseOption(opt: AttachOption) {
    setOpen(false);
    if (opt.key === "camera") {
      setCameraOpen(true);
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    if (opt.accept) input.setAttribute("accept", opt.accept);
    else input.removeAttribute("accept");
    input.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPick(file);
  }

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Attach"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/[0.08]"
      >
        <PaperClipIcon className="h-5 w-5" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              style={{ position: "fixed", bottom: rect.bottom + 8, left: rect.left }}
              className="glass z-50 flex w-56 flex-col gap-1 rounded-2xl p-2 shadow-glass"
            >
              {OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => chooseOption(opt)}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full text-white", opt.tone)}>
                    <opt.icon className="h-5 w-5" />
                  </span>
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {cameraOpen && (
        <CameraCaptureModal
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            onPick(file);
          }}
        />
      )}
    </>
  );
}
