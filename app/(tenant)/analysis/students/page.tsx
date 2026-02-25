import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { H1, MetaText, BodyText } from "@/components/ui/typography";
import { computeStudentRiskIndex, RiskBand, Confidence, BAND_ORDER } from "@/modules/analysis/studentRisk";
import { canViewStudentAnalysis } from "@/modules/authz";

const WINDOW_OPTIONS = [7, 21, 28] as const;

const BAND_LABELS: Record<RiskBand, string> = {
  URGENT: "Urgent",
  PRIORITY: "Priority",
  WATCH: "Watch",
  STABLE: "Stable",
};

const BAND_PILL: Record<RiskBand, string> = {
  URGENT: "bg-red-100 text-red-700",
  PRIORITY: "bg-amber-100 text-amber-700",
  WATCH: "bg-yellow-100 text-yellow-700",
  STABLE: "bg-green-100 text-green-700",
};

const CONFIDENCE_PILL: Record<Confidence, string> = {
  HIGH: "bg-slate-100 text-slate-500",
  LOW: "bg-orange-100 text-orange-600",
};

export default async function StudentAnalysisPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ANALYSIS");

  const canView = canViewStudentAnalysis({
    userId: user.id,
    role: user.role,
    hodDepartmentIds: [],
    coacheeUserIds: [],
  });
  if (!canView) notFound();

  const rawWindow = Number(searchParams?.window ?? "21");
  const windowDays = WINDOW_OPTIONS.includes(rawWindow as (typeof WINDOW_OPTIONS)[number])
    ? (rawWindow as (typeof WINDOW_OPTIONS)[number])
    : 21;

  // Filters
  const filterYearGroup = typeof searchParams?.yearGroup === "string" ? searchParams.yearGroup : "";
  const filterSend = typeof searchParams?.send === "string" ? searchParams.send : "";
  const filterPp = typeof searchParams?.pp === "string" ? searchParams.pp : "";
  const filterBand = typeof searchParams?.band === "string" ? searchParams.band : "";
  const filterConfidence = typeof searchParams?.confidence === "string" ? searchParams.confidence : "";
  const filterWatchlist = searchParams?.watchlist === "1";

  const { rows: allRows, computedAt } = await computeStudentRiskIndex(
    user.tenantId,
    windowDays,
    user.id
  );

  // Apply filters
  let rows = allRows;
  if (filterYearGroup) rows = rows.filter((r) => r.yearGroup === filterYearGroup);
  if (filterSend === "yes") rows = rows.filter((r) => r.sendFlag);
  if (filterSend === "no") rows = rows.filter((r) => !r.sendFlag);
  if (filterPp === "yes") rows = rows.filter((r) => r.ppFlag);
  if (filterPp === "no") rows = rows.filter((r) => !r.ppFlag);
  if (filterBand) rows = rows.filter((r) => r.band === filterBand);
  if (filterConfidence) rows = rows.filter((r) => r.confidence === filterConfidence);
  if (filterWatchlist) rows = rows.filter((r) => r.onWatchlist);

  // Collect distinct year groups for filter dropdown
  const yearGroups = Array.from(new Set(allRows.map((r) => r.yearGroup).filter(Boolean))).sort() as string[];

  const computedAtStr = computedAt.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const settings = await (prisma as any).tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
  });
  const effectiveWindow = settings?.defaultInsightWindowDays ?? windowDays;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <H1>Student support priorities</H1>
        <MetaText>
          Window: last {windowDays} days · Updated {computedAtStr} · Based on latest snapshots
        </MetaText>
      </div>

      {/* Window selector */}
      <div className="flex flex-wrap items-center gap-2">
        <MetaText className="mr-1">Window:</MetaText>
        {WINDOW_OPTIONS.map((w) => (
          <Link
            key={w}
            href={`/analysis/students?window=${w}`}
            className={`calm-transition rounded-lg border px-4 py-2 text-sm font-medium transition duration-200 ease-calm ${
              w === windowDays
                ? "border-accent bg-[var(--accent-tint)] text-text"
                : "border-border bg-surface text-text hover:border-accentHover"
            }`}
          >
            {w} days
          </Link>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" action="/analysis/students" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="window" value={windowDays} />

        <div className="flex flex-col gap-1">
          <MetaText>Year group</MetaText>
          <select
            name="yearGroup"
            defaultValue={filterYearGroup}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">All years</option>
            {yearGroups.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <MetaText>SEND</MetaText>
          <select
            name="send"
            defaultValue={filterSend}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <MetaText>PP</MetaText>
          <select
            name="pp"
            defaultValue={filterPp}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <MetaText>Band</MetaText>
          <select
            name="band"
            defaultValue={filterBand}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">All bands</option>
            {(Object.keys(BAND_ORDER) as RiskBand[]).map((b) => (
              <option key={b} value={b}>
                {BAND_LABELS[b]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <MetaText>Confidence</MetaText>
          <select
            name="confidence"
            defaultValue={filterConfidence}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">Any</option>
            <option value="HIGH">High</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <MetaText>Watchlist</MetaText>
          <select
            name="watchlist"
            defaultValue={filterWatchlist ? "1" : ""}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">All students</option>
            <option value="1">Watchlist only</option>
          </select>
        </div>

        <button
          type="submit"
          className="calm-transition rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition duration-200 ease-calm hover:border-accentHover"
        >
          Apply
        </button>
      </form>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <BodyText className="text-muted">
              No students found with snapshot data in the selected window.
            </BodyText>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3">Key drivers</th>
                <th className="px-4 py-3 text-right">Attendance</th>
                <th className="px-4 py-3 text-right">Detentions Δ</th>
                <th className="px-4 py-3 text-right">On calls Δ</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.studentId}
                  className="border-b border-divider last:border-0 hover:bg-bg"
                >
                  <td className="px-4 py-3 font-medium text-text">
                    <Link
                      href={`/analysis/students/${row.studentId}?window=${windowDays}`}
                      className="hover:underline"
                    >
                      {row.onWatchlist ? "★ " : ""}{row.studentName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.yearGroup ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${BAND_PILL[row.band]}`}
                    >
                      {BAND_LABELS[row.band]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{row.riskScore}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.drivers.map((d) => (
                        <span
                          key={d.metric}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {row.attendancePct !== null ? `${row.attendancePct.toFixed(1)}%` : "—"}
                    {row.attendanceDelta !== null && (
                      <span
                        className={`ml-1 text-xs ${
                          row.attendanceDelta < 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        ({row.attendanceDelta > 0 ? "+" : ""}
                        {row.attendanceDelta.toFixed(1)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {row.detentionsDelta !== null
                      ? row.detentionsDelta > 0
                        ? `+${row.detentionsDelta}`
                        : String(row.detentionsDelta)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {row.onCallsDelta !== null
                      ? row.onCallsDelta > 0
                        ? `+${row.onCallsDelta}`
                        : String(row.onCallsDelta)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {row.sendFlag && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                          SEND
                        </span>
                      )}
                      {row.ppFlag && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          PP
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONFIDENCE_PILL[row.confidence]}`}
                    >
                      {row.confidence === "HIGH" ? "High" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <MetaText>
        {rows.length} student{rows.length !== 1 ? "s" : ""} shown · Window: last {windowDays} days
      </MetaText>
    </div>
  );
}
