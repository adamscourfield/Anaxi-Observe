import { StudentSnapshotRecord } from "@/modules/students/types";
import { TrendIndicator } from "./TrendIndicator";
import { Card } from "@/components/ui/card";
import { H3, MetaText } from "@/components/ui/typography";

interface StudentMetricsCardProps {
  snapshot: StudentSnapshotRecord;
  previousSnapshot?: StudentSnapshotRecord | null;
}

function MetricRow({
  label,
  value,
  delta,
  metricType,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  metricType?: "behaviour" | "attendance";
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text">{value}</span>
        {delta !== undefined && (
          <TrendIndicator delta={delta} metricType={metricType} label={label} />
        )}
      </div>
    </div>
  );
}

export function StudentMetricsCard({ snapshot, previousSnapshot }: StudentMetricsCardProps) {
  const delta = (cur: number, prev: number | undefined) =>
    prev !== undefined ? cur - prev : null;

  return (
    <Card>
      <H3 className="mb-3">
        Snapshot: {new Date(snapshot.snapshotDate).toISOString().slice(0, 10)}
      </H3>
      <MetricRow
        label="Attendance"
        value={`${snapshot.attendancePct}%`}
        delta={delta(snapshot.attendancePct, previousSnapshot?.attendancePct)}
        metricType="attendance"
      />
      <MetricRow
        label="Positive Points"
        value={snapshot.positivePointsTotal}
        delta={delta(snapshot.positivePointsTotal, previousSnapshot?.positivePointsTotal)}
        metricType="behaviour"
      />
      <MetricRow
        label="Detentions"
        value={snapshot.detentionsCount}
        delta={delta(snapshot.detentionsCount, previousSnapshot?.detentionsCount)}
        metricType="behaviour"
      />
      <MetricRow
        label="Internal Exclusions"
        value={snapshot.internalExclusionsCount}
        delta={delta(snapshot.internalExclusionsCount, previousSnapshot?.internalExclusionsCount)}
        metricType="behaviour"
      />
      <MetricRow
        label="Suspensions"
        value={snapshot.suspensionsCount}
        delta={delta(snapshot.suspensionsCount, previousSnapshot?.suspensionsCount)}
        metricType="behaviour"
      />
      <MetricRow
        label="Lateness"
        value={snapshot.latenessCount}
        delta={delta(snapshot.latenessCount, previousSnapshot?.latenessCount)}
        metricType="behaviour"
      />
      <MetricRow
        label="On Calls"
        value={snapshot.onCallsCount}
        delta={delta(snapshot.onCallsCount, previousSnapshot?.onCallsCount)}
        metricType="behaviour"
      />
    </Card>
  );
}
