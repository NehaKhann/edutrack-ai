import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../theme/ThemeContext";

const COLOR_TEAL = "#2E86C1";
const COLOR_CORAL = "#D6332B";
const COLOR_AMBER = "#F59E0B";
const COLOR_BRAND = "#1B7A3E";

function useChartPalette() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    dark,
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    axis: dark ? "#94A3B8" : "#64748B",
    tooltipBg: dark ? "#1A1F1B" : "#FFFFFF",
    tooltipBorder: dark ? "rgba(255,255,255,0.12)" : "#E2E8F0",
    tooltipText: dark ? "#F1F5F9" : "#0F172A",
  };
}

type Palette = ReturnType<typeof useChartPalette>;

function ChartTooltip({
  active,
  payload,
  label,
  palette,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  palette: Palette;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{ background: palette.tooltipBg, border: `1px solid ${palette.tooltipBorder}`, color: palette.tooltipText }}
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
    >
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{formatter && p.value != null ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartEmptyState({ message = "No data to show yet.", height = 220 }: { message?: string; height?: number }) {
  return (
    <div className="flex items-center justify-center text-center text-sm text-slate-400 dark:text-slate-500" style={{ height }}>
      {message}
    </div>
  );
}

function thresholdColor(value: number): string {
  if (value >= 90) return COLOR_TEAL;
  if (value >= 75) return COLOR_AMBER;
  return COLOR_CORAL;
}

export function PercentBarChart({
  data,
  emptyMessage,
  valueLabel = "Value",
}: {
  data: { name: string; value: number }[];
  emptyMessage?: string;
  valueLabel?: string;
}) {
  const palette = useChartPalette();
  if (data.length === 0) return <ChartEmptyState message={emptyMessage} />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={{ stroke: palette.grid }} tickLine={false} interval={0} />
        <YAxis domain={[0, 100]} tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<ChartTooltip palette={palette} formatter={(v) => `${v}%`} />} cursor={{ fill: palette.grid }} />
        <Bar dataKey="value" name={valueLabel} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={thresholdColor(d.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusDonutChart({
  present,
  absent,
  late,
  emptyMessage,
}: {
  present: number;
  absent: number;
  late: number;
  emptyMessage?: string;
}) {
  const palette = useChartPalette();
  const total = present + absent + late;
  if (total === 0) return <ChartEmptyState message={emptyMessage} />;
  const data = [
    { name: "Present", value: present, color: COLOR_TEAL },
    { name: "Absent", value: absent, color: COLOR_CORAL },
    { name: "Late", value: late, color: COLOR_AMBER },
  ].filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip palette={palette} />} />
        <Legend verticalAlign="bottom" height={28} formatter={(value: ReactNode) => <span style={{ color: palette.axis, fontSize: 12 }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
  emptyMessage,
}: {
  data: { label: string; value: number }[];
  emptyMessage?: string;
}) {
  const palette = useChartPalette();
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return <ChartEmptyState message={emptyMessage} height={160} />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 11 }} axisLine={{ stroke: palette.grid }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: palette.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<ChartTooltip palette={palette} formatter={(v) => `${v}%`} />} cursor={{ stroke: palette.grid }} />
        <Line
          type="monotone"
          dataKey="value"
          name="Attendance"
          stroke={COLOR_BRAND}
          strokeWidth={2.5}
          dot={{ r: 3, fill: COLOR_BRAND, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
