import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../components/PageHeader";
import { Card, CardBody } from "../components/Card";
import { TextInput } from "../components/FormFields";
import { Alert } from "../components/Alert";
import { EmptyState } from "../components/EmptyState";
import { Spinner } from "../components/Spinner";
import { DateRangeChip } from "../components/DateRangeChip";
import * as searchApi from "../api/search";
import { errorMessage } from "../api/client";
import type { TopicSearchResult } from "../types";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TopicSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchApi
        .searchTopics(query.trim())
        .then((data) => {
          setResults(data);
          setSearched(true);
        })
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div>
      <PageHeader title="Search Topics" description="Find a topic by keyword across your subjects and terms." />

      <div className="mb-5 max-w-md">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. fractions, photosynthesis, nouns..."
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : searched && results.length === 0 ? (
        <EmptyState title="No matching topics" description="Try a different keyword." />
      ) : results.length > 0 ? (
        <Card>
          <CardBody className="divide-y divide-slate-100 p-0 dark:divide-white/[0.08]">
            {results.map((r) => (
              <div key={r.topicId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
                    {r.covered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                        <CheckCircleIcon className="h-3 w-3" /> Covered
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {r.subjectName} &middot; {r.classSectionName} &middot; {r.syllabusTerm}
                  </p>
                </div>
                <DateRangeChip start={r.plannedStartDate} end={r.plannedEndDate} className="shrink-0" />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">Type at least 2 characters to search.</p>
      )}
    </div>
  );
}
