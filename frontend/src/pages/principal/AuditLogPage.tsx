import { useEffect, useState } from "react";
import { ClipboardDocumentListIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { Badge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";
import { FullPageSpinner } from "../../components/Spinner";
import { Alert } from "../../components/Alert";
import { errorMessage } from "../../api/client";
import * as auditApi from "../../api/auditLog";
import type { AuditLogEntry } from "../../types/audit";

const ACTION_META: Record<string, { label: string; tone: "green" | "blue" | "red" | "amber" | "gray" }> = {
  CORRECTION_APPROVED: { label: "Correction approved", tone: "green" },
  CORRECTION_REJECTED: { label: "Correction rejected", tone: "red" },
  CORRECTION_CANCELLED: { label: "Correction cancelled", tone: "gray" },
  LEAVE_APPROVED: { label: "Leave approved", tone: "green" },
  LEAVE_REJECTED: { label: "Leave rejected", tone: "red" },
  LEAVE_CANCELLED: { label: "Leave cancelled", tone: "gray" },
  ATTENDANCE_OVERRIDDEN: { label: "Attendance overridden", tone: "amber" },
  ATTENDANCE_POLICY_UPDATED: { label: "Policy updated", tone: "blue" },
  FACE_ENROLLMENT_APPROVED: { label: "Face enrollment approved", tone: "green" },
  FACE_ENROLLMENT_REJECTED: { label: "Face enrollment rejected", tone: "red" },
  TEACHER_ACCOUNT_CREATED: { label: "Teacher account created", tone: "blue" },
  TEACHER_PASSWORD_RESET: { label: "Password reset", tone: "amber" },
  TEACHER_DEACTIVATED: { label: "Teacher deactivated", tone: "red" },
  TEACHER_REACTIVATED: { label: "Teacher reactivated", tone: "green" },
  STUDENT_CREATED: { label: "Student added", tone: "blue" },
  STUDENT_UPDATED: { label: "Student updated", tone: "gray" },
  STUDENT_DEACTIVATED: { label: "Student deactivated", tone: "red" },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, tone: "gray" as const };
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    auditApi
      .listAuditLog(page)
      .then((result) => {
        if (cancelled) return;
        setEntries(result.items);
        setTotalPages(result.totalPages);
        setTotalItems(result.totalItems);
      })
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every approval, rejection, and account change across the school, with who did it and when."
      />
      {error && <Alert type="error">{error}</Alert>}

      {entries === null ? (
        <FullPageSpinner />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardDocumentListIcon className="h-10 w-10" />}
          title="No activity yet"
          description="Approvals, rejections, and account changes will show up here as they happen."
        />
      ) : (
        <Card>
          <ResponsiveTable>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                {entries.map((e) => {
                  const meta = actionMeta(e.action);
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{e.actorName}</td>
                      <td className="px-5 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{e.targetLabel ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{e.detail ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResponsiveTable>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
              <span>
                Page {page + 1} of {totalPages} &middot; {totalItems} total
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeftIcon className="h-4 w-4" /> Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
