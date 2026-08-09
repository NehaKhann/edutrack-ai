import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../components/PageHeader";
import { Card, CardBody, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { Field, TextInput } from "../components/FormFields";
import { Alert } from "../components/Alert";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../auth/AuthContext";
import * as calendarApi from "../api/calendar";
import { errorMessage } from "../api/client";
import { DAYS_OF_WEEK, type DayOfWeek } from "../types/profile";
import type { Holiday, MonthView } from "../types/calendar";

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

export function CalendarPage() {
  const { user } = useAuth();
  const isPrincipal = user?.role === "PRINCIPAL" || user?.role === "ADMIN";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthView, setMonthView] = useState<MonthView | null>(null);
  const [allHolidays, setAllHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);

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

  useEffect(() => {
    if (!isPrincipal) return;
    calendarApi.listHolidays().then(setAllHolidays).catch(() => {});
  }, [isPrincipal, monthView]);

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

  function holidayFor(iso: string): Holiday | undefined {
    return monthView?.holidays.find((h) => iso >= h.startDate && iso <= h.endDate);
  }

  async function handleAddHoliday(payload: { name: string; startDate: string; endDate: string }) {
    await calendarApi.addHoliday(payload);
    loadMonth(year, month);
    setShowAddHoliday(false);
  }

  async function handleDeleteHoliday(id: number) {
    if (!confirm("Remove this holiday?")) return;
    try {
      await calendarApi.deleteHoliday(id);
      loadMonth(year, month);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const todayIso = toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return (
    <div>
      <PageHeader
        title="School Calendar"
        description="Weekends and holidays — feeding directly into lesson planning and auto-rescheduling."
        actions={
          isPrincipal ? (
            <Button size="sm" variant="secondary" onClick={() => setShowAddHoliday((v) => !v)}>
              <PlusIcon className="h-4 w-4" /> Add holiday
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {isPrincipal && showAddHoliday && (
        <div className="mb-5">
          <AddHolidayForm onCancel={() => setShowAddHoliday(false)} onSave={handleAddHoliday} onError={(e) => setError(errorMessage(e))} />
        </div>
      )}

      {isPrincipal && <div className="mb-5"><WeekendDaysCard onError={(e) => setError(errorMessage(e))} /></div>}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => goToMonth(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h3 className="w-40 text-center text-sm font-semibold text-slate-800">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            <button onClick={() => goToMonth(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
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
                <div key={d} className="pb-1 text-center text-xs font-semibold uppercase text-slate-400">
                  {DAY_SHORT[d]}
                </div>
              ))}
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} />;
                const isWeekend = monthView.weekendDays.includes(cell.dayOfWeek);
                const holiday = holidayFor(cell.iso);
                const isToday = cell.iso === todayIso;
                return (
                  <div
                    key={cell.iso}
                    title={holiday?.name}
                    className={`flex min-h-[64px] flex-col rounded-lg border p-1.5 text-xs ${
                      holiday
                        ? "border-amber-200 bg-amber-50"
                        : isWeekend
                        ? "border-slate-200 bg-slate-100"
                        : "border-slate-100 bg-white"
                    } ${isToday ? "ring-2 ring-brand-500" : ""}`}
                  >
                    <span className={`font-medium ${holiday || isWeekend ? "text-slate-500" : "text-slate-700"}`}>{cell.day}</span>
                    {holiday && <span className="mt-1 truncate text-[10px] font-medium text-amber-700">{holiday.name}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {isPrincipal && (
        <Card className="mt-5">
          <CardHeader>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CalendarDaysIcon className="h-4 w-4 text-slate-400" /> All holidays
            </h3>
          </CardHeader>
          <CardBody className="space-y-1">
            {allHolidays.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">No holidays added yet.</p>
            ) : (
              allHolidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  <div>
                    <span className="font-medium text-slate-800">{h.name}</span>
                    <span className="ml-2 text-slate-500">
                      {h.startDate}
                      {h.endDate !== h.startDate ? ` → ${h.endDate}` : ""}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteHoliday(h.id)} className="text-slate-400 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function AddHolidayForm({
  onCancel,
  onSave,
  onError,
}: {
  onCancel: () => void;
  onSave: (payload: { name: string; startDate: string; endDate: string }) => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSave({ name, startDate, endDate });
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Field label="Holiday name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid ul Fitr" autoFocus />
          </Field>
        </div>
        <Field label="Start date">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <div className="col-span-full flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={saving} disabled={!name}>
            Save
          </Button>
        </div>
      </CardBody>
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
        <h3 className="text-sm font-semibold text-slate-800">Weekend days</h3>
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
                active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
