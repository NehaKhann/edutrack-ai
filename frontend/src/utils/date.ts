const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/** "2026-02-16" -> "Feb 16, 2026" */
export function formatDate(iso: string): string {
  const p = parts(iso);
  if (!p) return iso;
  return `${MONTHS[p.m]} ${p.d}, ${p.y}`;
}

/**
 * Formats a date range the way a person would write it by hand — collapsing the
 * shared month/year instead of repeating the full date on both ends.
 *   same month+year:  "Feb 16 – 28, 2026"
 *   same year:        "Feb 16 – Mar 15, 2026"
 *   different years:  "Dec 20, 2026 – Jan 5, 2027"
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parts(startIso);
  const end = parts(endIso);
  if (!start || !end) return `${startIso} → ${endIso}`;

  if (start.y === end.y && start.m === end.m) {
    return `${MONTHS[start.m]} ${start.d}–${end.d}, ${start.y}`;
  }
  if (start.y === end.y) {
    return `${MONTHS[start.m]} ${start.d} – ${MONTHS[end.m]} ${end.d}, ${start.y}`;
  }
  return `${MONTHS[start.m]} ${start.d}, ${start.y} – ${MONTHS[end.m]} ${end.d}, ${end.y}`;
}
