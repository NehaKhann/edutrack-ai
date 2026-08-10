import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { Spinner } from "../../components/Spinner";
import { SkeletonRows } from "../../components/Skeleton";
import { StatusBadge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import * as coverageApi from "../../api/coverage";
import { errorMessage } from "../../api/client";
import type { CoverageGridRow, SubjectCoverageDetail } from "../../types";

const CHRONIC_THRESHOLD_DAYS = 14;

export function CoverageGridPage() {
  const [rows, setRows] = useState<CoverageGridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<SubjectCoverageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const chronicRows = rows.filter((r) => (r.daysBehind ?? 0) >= CHRONIC_THRESHOLD_DAYS);

  useEffect(() => {
    coverageApi
      .getCoverageGrid()
      .then(setRows)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await coverageApi.downloadCoverageReportPdf();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  async function openDetail(subjectId: number) {
    setDetailLoading(true);
    try {
      const data = await coverageApi.getSubjectCoverageDetail(subjectId);
      setDetail(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Syllabus Coverage"
        description="Class × Subject pacing, school-wide — click a row for detail."
        actions={
          <Button variant="secondary" onClick={handleExport} loading={exporting}>
            <ArrowDownTrayIcon className="h-4 w-4" /> Export PDF
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {!bannerDismissed && chronicRows.length > 0 && (
        <div className="mb-4">
          <Alert type="warning">
            <div className="flex items-start justify-between gap-3">
              <span>
                <strong>{chronicRows.length}</strong> subject{chronicRows.length > 1 ? "s" : ""} {chronicRows.length > 1 ? "have" : "has"} been
                behind schedule for {CHRONIC_THRESHOLD_DAYS}+ days:{" "}
                {chronicRows.map((r) => `${r.subjectName} (${r.classSectionName})`).join(", ")}.
              </span>
              <button
                onClick={() => setBannerDismissed(true)}
                className="shrink-0 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      {loading ? (
        <SkeletonRows count={4} />
      ) : rows.length === 0 ? (
        <EmptyState title="No subjects yet" description="Once subjects and syllabi are set up, coverage will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <ResponsiveTable>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Teacher</th>
                  <th className="px-5 py-3">Planned to date</th>
                  <th className="px-5 py-3">Covered</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr
                    key={row.subjectId}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => openDetail(row.subjectId)}
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">{row.classSectionName}</td>
                    <td className="px-5 py-3 text-slate-600">{row.subjectName}</td>
                    <td className="px-5 py-3 text-slate-600">{row.teacherName}</td>
                    <td className="px-5 py-3 text-slate-600">{row.plannedToDateCount}</td>
                    <td className="px-5 py-3 text-slate-600">{row.coveredCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={row.status} />
                        {row.daysBehind != null && row.daysBehind >= CHRONIC_THRESHOLD_DAYS && (
                          <span
                            className="flex items-center gap-1 text-[11px] font-semibold text-red-600"
                            title={`Behind schedule for ${row.daysBehind} days`}
                          >
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" /> {row.daysBehind}d
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </Card>
      )}

      <Modal open={!!detail || detailLoading} onClose={() => setDetail(null)} title={detail?.subjectName ?? "Loading..."}>
        {detailLoading || !detail ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Topics</h4>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {detail.topics.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-700">{t.title}</span>
                    <StatusBadge status={t.covered ? "COVERED" : "PLANNED"} />
                  </div>
                ))}
                {detail.topics.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No topics yet.</p>}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Missed / rescheduled lessons</h4>
              {detail.missedOrRescheduledEntries.length === 0 ? (
                <p className="text-sm text-slate-400">No missed lessons recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {detail.missedOrRescheduledEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span className="text-slate-700">{e.topicTitle}</span>
                        <span className="ml-2 text-xs text-slate-400">{e.plannedDate}</span>
                        {e.reason && <p className="text-xs text-slate-400">{e.reason}</p>}
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
