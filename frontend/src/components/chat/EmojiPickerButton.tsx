import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaceSmileIcon } from "@heroicons/react/24/outline";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉", "😎", "🤔",
  "😅", "😴", "😢", "😭", "😮", "😲", "😡", "🥳", "🤗", "🙄",
  "👍", "👎", "👏", "🙌", "🙏", "👋", "💪", "✌️", "🤝", "👌",
  "❤️", "🎉", "🔥", "⭐", "✅", "❌", "⏰", "📌", "📎", "📷",
  "📚", "✏️", "🏫", "🎤", "💯", "😴", "🤷", "👀", "💬", "😅",
];

export function EmojiPickerButton({ onPick, disabled }: { onPick: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Insert emoji"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/[0.08]"
      >
        <FaceSmileIcon className="h-5 w-5" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", bottom: rect.bottom + 8, left: rect.left }}
              className="glass z-50 grid w-64 grid-cols-8 gap-1 rounded-2xl p-2.5 shadow-glass"
            >
              {EMOJIS.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => onPick(emoji)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-lg hover:bg-slate-100 dark:hover:bg-white/[0.1]"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
