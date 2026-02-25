import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { Card } from "@/components/ui/card";
import { H1, H2, MetaText, BodyText } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { computeStudentRiskProfile, RiskBand, Confidence } from "@/modules/analysis/studentRisk";
import { canViewStudentAnalysis } from "@/modules/authz";
import { toggleWatchlist } from "../actions";

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

function DeltaCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const color = value > 0 ? "text-red-600" : value < 0 ? "text-green-600" : "text-muted";
  return (
    <span className={`tabular-nums font-medium ${color}`}>
      {value > 0 ? `+${value}` : String(value)}
    </span>
  );
}

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
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

  const profile = await computeStudentRiskProfile(
    user.tenantId,
    params.id,
    windowDays,
    user.id
  );

  if (!profile) notFound();

  const computedAtStr = profile.computedAt.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lastSnapshotStr = profile.lastSnapshotDate
    ? new Date(profile.lastSnapshotDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/analysis/students?window=${windowDays}`}
        className="text-sm text-muted hover:underline"
      >
        ← Back to student support priorities
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <H1>{profile.studentName}</H1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${BAND_PILL[profile.band]}`}
          >
            {BAND_LABELS[profile.band]}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONFIDENCE_PILL[profile.confidence]}`}
          >
            Confidence: {profile.confidence === "HIGH" ? "High" : "Low"}
          </span>
          {profile.sendFlag && (
            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
              SEND
            </span>
          )}
          {profile.ppFlag && (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
              PP
            </span>
          )}
        </div>
        <MetaText>
          Year {profile.yearGroup ?? "—"} · Risk score: {profile.riskScore}
          {lastSnapshotStr ? ` · Last snapshot: ${lastSnapshotStr}` : ""}
          {" · "}Updated {computedAtStr}
        </MetaText>
        {profile.confidence === "LOW" && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2">
            <BodyText className="text-orange-700 text-sm">
              Low confidence: no previous snapshot found in the preceding window. Deltas cannot be computed.
            </BodyText>
          </div>
        )}
      </div>

      {/* Window selector */}
      <div className="flex items-center gap-2">
        <MetaText className="mr-1">Window:</MetaText>
        {WINDOW_OPTIONS.map((w) => (
          <Link
            key={w}
            href={`/analysis/students/${params.id}?window=${w}`}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* What changed */}
        <Card>
          <div className="mb-4 border-b border-border pb-3">
            <H2>What changed</H2>
            <MetaText>Deltas: current period vs previous period</MetaText>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-divider">
              <tr>
                <td className="py-2 text-muted">Attendance</td>
                <td className="py-2 text-right">
                  {profile.attendanceDelta !== null ? (
                    <span
                      className={`tabular-nums font-medium ${
                        profile.attendanceDelta < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {profile.attendanceDelta > 0 ? "+" : ""}
                      {profile.attendanceDelta.toFixed(1)} pp
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-muted">On calls</td>
                <td className="py-2 text-right">
                  <DeltaCell value={profile.onCallsDelta} />
                </td>
              </tr>
              <tr>
                <td className="py-2 text-muted">Detentions</td>
                <td className="py-2 text-right">
                  <DeltaCell value={profile.detentionsDelta} />
                </td>
              </tr>
              <tr>
                <td className="py-2 text-muted">Lateness</td>
                <td className="py-2 text-right">
                  <DeltaCell value={profile.latenessDelta} />
                </td>
              </tr>
              <tr>
                <td className="py-2 text-muted">Internal exclusions</td>
                <td className="py-2 text-right">
                  <DeltaCell value={profile.internalExclusionsDelta} />
                </td>
              </tr>
              <tr>
                <td className="py-2 text-muted">Suspensions</td>
                <td className="py-2 text-right">
                  <DeltaCell value={profile.suspensionsDelta} />
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* Current snapshot */}
        <Card>
          <div className="mb-4 border-b border-border pb-3">
            <H2>Current snapshot</H2>
            {profile.currentSnapshot && (
              <MetaText>
                {new Date(profile.currentSnapshot.snapshotDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </MetaText>
            )}
          </div>
          {profile.currentSnapshot ? (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-divider">
                <tr>
                  <td className="py-2 text-muted">Attendance</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.attendancePct.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-muted">On calls</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.onCallsCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-muted">Detentions</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.detentionsCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-muted">Lateness</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.latenessCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-muted">Internal exclusions</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.internalExclusionsCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-muted">Suspensions</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.suspensionsCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-muted">Positive points</td>
                  <td className="py-2 text-right tabular-nums font-medium text-text">
                    {profile.currentSnapshot.positivePointsTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <BodyText className="text-muted">No snapshot data in the selected window.</BodyText>
          )}
        </Card>
      </div>

      {/* Trend — last 3 snapshots */}
      {profile.recentSnapshots.length > 1 && (
        <Card>
          <div className="mb-4 border-b border-border pb-3">
            <H2>Recent trend</H2>
            <MetaText>Last {profile.recentSnapshots.length} snapshots</MetaText>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="pb-2">Date</th>
                <th className="pb-2 text-right">Attendance</th>
                <th className="pb-2 text-right">On calls</th>
                <th className="pb-2 text-right">Detentions</th>
                <th className="pb-2 text-right">Lateness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {profile.recentSnapshots.map((snap, i) => (
                <tr key={i}>
                  <td className="py-2 text-muted">
                    {new Date(snap.snapshotDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2 text-right tabular-nums text-text">
                    {snap.attendancePct.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right tabular-nums text-text">{snap.onCallsCount}</td>
                  <td className="py-2 text-right tabular-nums text-text">{snap.detentionsCount}</td>
                  <td className="py-2 text-right tabular-nums text-text">{snap.latenessCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3" id="behaviour-history">
        <form
          action={async () => {
            "use server";
            await toggleWatchlist(profile.studentId);
          }}
        >
          <Button variant={profile.onWatchlist ? "primary" : "secondary"} type="submit">
            {profile.onWatchlist ? "★ On watchlist" : "Add to watchlist"}
          </Button>
        </form>
        <Link href={`/tenant/students/${profile.studentId}`} passHref>
          <Button variant="secondary">View behaviour history</Button>
        </Link>
      </div>
    </div>
  );
}
