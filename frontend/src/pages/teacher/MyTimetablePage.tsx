import { useEffect, useState } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRows } from "../../components/Skeleton";
import { TimetableGrid } from "../../components/TimetableGrid";
import * as timetableApi from "../../api/timetable";
import { errorMessage } from "../../api/client";
import type { TeacherTimetable } from "../../types/timetable";

export function MyTimetablePage() {
  const [timetable, setTimetable] = useState<TeacherTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    timetableApi
      .getMyTimetable()
      .then(setTimetable)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My Timetable" description="Your weekly schedule — which class and subject you teach each period." />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <SkeletonRows count={5} />
      ) : !timetable || timetable.entries.length === 0 ? (
        <EmptyState
          icon={<CalendarDaysIcon className="h-8 w-8" />}
          title="No timetable assigned yet"
          description="Once the Principal assigns you periods on the class timetable, they'll show up here automatically."
        />
      ) : (
        <Card>
          <CardBody>
            <TimetableGrid entries={timetable.entries} mode="teacher" />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
