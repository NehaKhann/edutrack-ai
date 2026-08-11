import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, BoltIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../components/PageHeader";
import { Card, CardBody, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { Field, TextInput, Select } from "../components/FormFields";
import { Modal } from "../components/Modal";
import { Alert } from "../components/Alert";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../auth/AuthContext";
import * as calendarApi from "../api/calendar";
import { errorMessage } from "../api/client";
import { formatDate } from "../utils/date";
import { DAYS_OF_WEEK, type DayOfWeek } from "../types/profile";
import type { DayOverride, DayStatus, MonthView } from "../types/calendar";

const JS_DAY_TO_ENUM: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};
const DAY_LONG: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLong(iso: string): string {
  const d = parseIso(iso);
  return `${DAY_LONG[JS_DAY_TO_ENUM[d.getDay()]]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function countMatchingDays(start: string, end: string, dayOfWeek: DayOfWeek | ""): number {
  const startDate = parseIso(start);
  const endDate = parseIso(end);
  if (endDate < startDate) return 0;
  let count = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (!dayOfWeek || JS_DAY_TO_ENUM[d.getDay()] === dayOfWeek) count++;
  }
  return count;
}

export function CalendarPage() {
  const { user } = useAuth();
  const isPrincipal = user?.role === "PRINCIPAL" || user?.role === "ADMIN";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthView, setMonthView] = useState<MonthView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  function loadMonth(y: number, m: number) {
    setLoading(true);
    setError(null);
    calendarApi
      .getMonthView(y, m)
      .then(setMonthView)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMonth(year, month);
  }, [year, month]);

  function goToMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  const grid = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayJs = new Date(year, month - 1, 1).getDay();
    const leadingBlanks = (firstDayJs + 6) % 7; // Monday-first grid
    const cells: Array<{ day: number; iso: string; dayOfWeek: DayOfWeek } | null> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = JS_DAY_TO_ENUM[new Date(year, month - 1, day).getDay()];
      cells.push({ day, iso: toIso(year, month, day), dayOfWeek });
    }
    return cells;
  }, [year, month]);

  const overrideByIso = useMemo(() => {
    const map = new Map<string, DayOverride>();
    monthView?.overrides.forEach((o) => map.set(o.date, o));
    return map;
  }, [monthView]);

  const todayIso = toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const selectedCell = selectedIso ? grid.find((c) => c?.iso === selectedIso) ?? null : null;

  function handleSaved(updated: MonthView) {
    setMonthView(updated);
    setSelectedIso(null);
  }

  return (
    <div>
      <PageHeader
        title="School Calendar"
        description="Weekends and day-by-day exceptions — feeding directly into lesson planning and auto-rescheduling."
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {isPrincipal && <div className="mb-5"><WeekendDaysCard onError={(e) => setError(errorMessage(e))} /></div>}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => goToMonth(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.08]"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h3 className="w-40 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            <button
              onClick={() => goToMonth(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.08]"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-500" /> Weekend</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Off</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> Extra working</span>
          </div>
        </CardHeader>
        <CardBody>
          {loading || !monthView ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="pb-1 text-center text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                  {DAY_SHORT[d]}
                </div>
              ))}
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} />;
                const isWeekend = monthView.weekendDays.includes(cell.dayOfWeek);
                const override = overrideByIso.get(cell.iso);
                const isToday = cell.iso === todayIso;

                let cellClass = "border-slate-100 bg-white dark:border-white/10 dark:bg-white/5";
                let labelClass = "text-slate-700 dark:text-slate-300";
                if (override?.status === "OFF") {
                  cellClass = "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10";
                  labelClass = "text-amber-700 dark:text-amber-300";
                } else if (override?.status === "WORKING") {
                  cellClass = "border-teal-300 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10";
                  labelClass = "text-teal-700 dark:text-teal-300";
                } else if (isWeekend) {
                  cellClass = "border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.08]";
                  labelClass = "text-slate-500 dark:text-slate-400";
                }

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={!isPrincipal}
                    onClick={() => setSelectedIso(cell.iso)}
                    title={override?.reason ?? undefined}
                    className={`flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left text-xs transition-colors ${cellClass} ${
                      isToday ? "ring-2 ring-brand-500" : ""
                    } ${isPrincipal ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
                  >
                    <span className={`font-medium ${labelClass}`}>{cell.day}</span>
                    {override && (
                      <span className={`mt-1 truncate text-[10px] font-medium ${labelClass}`}>
                        {override.status === "OFF" ? (override.reason || "Off") : (override.reason || "Working")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {isPrincipal && (
        <div className="mt-5">
          <BulkUpdateCard onDone={(v) => loadMonth(v.year, v.month)} onError={(e) => setError(errorMessage(e))} />
        </div>
      )}

      {isPrincipal && selectedCell && monthView && (
        <DayModal
          iso={selectedCell.iso}
          isWeekendByDefault={monthView.weekendDays.includes(selectedCell.dayOfWeek)}
          override={overrideByIso.get(selectedCell.iso)}
          onClose={() => setSelectedIso(null)}
          onSaved={handleSaved}
          onError={(e) => setError(errorMessage(e))}
        />
      )}
    </div>
  );
}

function DayModal({
  iso,
  isWeekendByDefault,
  override,
  onClose,
  onSaved,
  onError,
}: {
  iso: string;
  isWeekendByDefault: boolean;
  override: DayOverride | undefined;
  onClose: () => void;
  onSaved: (v: MonthView) => void;
  onError: (e: unknown) => void;
}) {
  const defaultStatus: DayStatus = isWeekendByDefault ? "OFF" : "WORKING";
  const [status, setStatus] = useState<DayStatus>(override?.status ?? defaultStatus);
  const [reason, setReason] = useState(override?.reason ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await calendarApi.setDay(iso, status, reason.trim() || undefined);
      onSaved(updated);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const updated = await calendarApi.resetDay(iso);
      onSaved(updated);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={formatLong(iso)} widthClass="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Normally a{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {defaultStatus === "OFF" ? "weekend / off" : "working"}
          </span>{" "}
          day.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus("WORKING")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              status === "WORKING"
                ? "border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300"
                : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
          >
            Working day
          </button>
          <button
            type="button"
            onClick={() => setStatus("OFF")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              status === "OFF"
                ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
          >
            Holiday / Off
          </button>
        </div>

        <Field label="Reason (optional)">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Eid ul Fitr, Makeup day" />
        </Field>

        {override && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Last changed{override.changedByName ? ` by ${override.changedByName}` : ""}
            {override.changedAt ? ` on ${new Date(override.changedAt).toLocaleString()}` : ""}.
          </p>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
          {override ? (
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving}>
              <ArrowPathIcon className="h-4 w-4" /> Reset to default
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function BulkUpdateCard({
  onDone,
  onError,
}: {
  onDone: (v: { year: number; month: number }) => void;
  onError: (e: unknown) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | "">("");
  const [status, setStatus] = useState<DayStatus>("OFF");
  const [reason, setReason] = useState("");
  const [confirmCount, setConfirmCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function handleApplyClick() {
    setResult(null);
    if (endDate < startDate) {
      onError(new Error("End date must be on or after the start date"));
      return;
    }
    const n = countMatchingDays(startDate, endDate, dayOfWeek);
    if (n === 0) {
      onError(new Error("No matching days in that range"));
      return;
    }
    setConfirmCount(n);
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const res = await calendarApi.bulkUpdate({ startDate, endDate, dayOfWeek: dayOfWeek || null, status, reason: reason.trim() || undefined });
      setResult(`Updated ${res.updatedCount} day(s).`);
      setConfirmCount(null);
      const [y, m] = startDate.split("-").map(Number);
      onDone({ year: y, month: m });
    } catch (e) {
      onError(e);
      setConfirmCount(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <BoltIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Bulk update
        </h3>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <Field label="Start date">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Field label="Apply to">
          <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek | "")}>
            <option value="">Every day</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>
                Only {DAY_LONG[d]}s
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Set to">
          <Select value={status} onChange={(e) => setStatus(e.target.value as DayStatus)}>
            <option value="OFF">Off / Holiday</option>
            <option value="WORKING">Working</option>
          </Select>
        </Field>
        <Field label="Reason (optional)">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Summer break" />
        </Field>
        <div className="col-span-full flex items-center justify-between">
          {result ? <p className="text-sm text-teal-600 dark:text-teal-400">{result}</p> : <span />}
          <Button size="sm" variant="secondary" onClick={handleApplyClick}>
            Apply
          </Button>
        </div>
      </CardBody>

      <Modal open={confirmCount !== null} onClose={() => setConfirmCount(null)} title="Confirm bulk update" widthClass="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This will mark <span className="font-semibold">{confirmCount}</span> day(s) between{" "}
            <span className="font-medium">{formatDate(startDate)}</span> and <span className="font-medium">{formatDate(endDate)}</span> as{" "}
            <span className="font-semibold">{status === "OFF" ? "Off / Holiday" : "Working"}</span>. Continue?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmCount(null)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} loading={saving}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function WeekendDaysCard({ onError }: { onError: (e: unknown) => void }) {
  const [selected, setSelected] = useState<Set<DayOfWeek>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    calendarApi
      .getWeekendDays()
      .then((days) => setSelected(new Set(days)))
      .catch((e) => onError(e))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(day: DayOfWeek) {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    setSelected(next);
    setSaving(true);
    try {
      await calendarApi.setWeekendDays(Array.from(next));
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Weekend days (default pattern)</h3>
      </CardHeader>
      <CardBody className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((d) => {
          const active = selected.has(d);
          return (
            <button
              key={d}
              disabled={saving}
              onClick={() => toggle(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-glow-brand"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.12]"
              }`}
            >
              {DAY_SHORT[d]}
            </button>
          );
        })}
      </CardBody>
    </Card>
  );
}
