import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { formatDate } from "../utils/date";

function parseIso(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const triggerBase =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-navy-800 dark:text-slate-100 dark:hover:border-white/25";

interface Props {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  /** ISO date string (inclusive). Days before this are disabled and out of nav range. */
  minDate?: string;
  /** ISO date string (inclusive). Days after this are disabled and out of nav range. */
  maxDate?: string;
}

export function DatePicker({ value, onChange, className, disabled, placeholder = "Select date", minDate, maxDate }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);

  const selected = parseIso(value);
  const minDateObj = minDate ? parseIso(minDate) : undefined;
  const maxDateObj = maxDate ? parseIso(maxDate) : undefined;

  useLayoutEffect(() => {
    if (!open) return;
    function updateRect() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUpward = spaceBelow < 360 && r.top > spaceBelow;
      setRect({ top: openUpward ? r.top : r.bottom, left: r.left, width: r.width, openUpward });
    }
    updateRect();
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={clsx(triggerBase, disabled && "cursor-not-allowed opacity-60", className)}
      >
        <span className={clsx("truncate", !value && "text-slate-400 dark:text-slate-500")}>
          {value ? formatDate(value) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: rect.openUpward ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: rect.openUpward ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                top: rect.top,
                left: rect.left,
                transform: rect.openUpward ? "translateY(calc(-100% - 6px))" : "translateY(6px)",
              }}
              className="glass z-50 rounded-2xl p-3 shadow-glass"
            >
              <DayPicker
                mode="single"
                selected={selected}
                defaultMonth={selected}
                showOutsideDays
                navLayout="around"
                captionLayout="dropdown"
                startMonth={minDateObj}
                endMonth={maxDateObj}
                disabled={
                  minDateObj || maxDateObj
                    ? [...(minDateObj ? [{ before: minDateObj }] : []), ...(maxDateObj ? [{ after: maxDateObj }] : [])]
                    : undefined
                }
                onSelect={(day) => {
                  if (day) onChange({ target: { value: toIso(day) } });
                  setOpen(false);
                }}
                classNames={{
                  root: "",
                  months: "",
                  month: "space-y-2",
                  month_caption: "flex items-center justify-center pb-1",
                  caption_label:
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10",
                  dropdowns: "flex items-center justify-center gap-1",
                  dropdown: "absolute inset-0 z-10 cursor-pointer appearance-none opacity-0",
                  dropdown_root: "relative inline-flex items-center",
                  nav: "flex items-center justify-between",
                  chevron: "h-4 w-4 fill-current",
                  button_previous:
                    "h-7 w-7 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 disabled:opacity-30",
                  button_next:
                    "h-7 w-7 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 disabled:opacity-30",
                  month_grid: "w-full border-collapse",
                  weekdays: "",
                  weekday: "h-8 w-8 text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500",
                  weeks: "",
                  week: "",
                  week_number: "",
                  week_number_header: "",
                  years_dropdown: "",
                  months_dropdown: "",
                  footer: "",
                  day: "h-8 w-8 p-0 text-center align-middle",
                  day_button:
                    "h-8 w-8 rounded-full text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10",
                  today: "[&>button]:font-bold [&>button]:text-brand-600 dark:[&>button]:text-brand-400",
                  selected: "[&>button]:bg-brand-600 [&>button]:text-white [&>button]:hover:bg-brand-600 [&>button]:font-semibold",
                  outside: "[&>button]:text-slate-300 dark:[&>button]:text-slate-600",
                  disabled: "[&>button]:text-slate-300 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent dark:[&>button]:text-slate-700",
                  hidden: "invisible",
                  focused: "",
                  range_start: "",
                  range_middle: "",
                  range_end: "",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
