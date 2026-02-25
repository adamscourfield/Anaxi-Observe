import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { H1, H2, BodyText, MetaText } from "@/components/ui/typography";
import { StatusPill, PillVariant } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { DriverChips } from "@/components/ui/driver-chips";
import {
  computeCpdPriorities,
  getTopImprovingSignals,
  CpdPriorityRow,
} from "@/modules/analysis/cpdPriorities";
import {
  computeTeacherRiskIndex,
  computeTeacherSignalProfile,
  TeacherRiskRow,
  RiskStatus,
} from "@/modules/analysis/teacherRisk";
import { computeStudentRiskIndex, StudentRiskRow } from "@/modules/analysis/studentRisk";
import { computeCohortPivot, CohortPivotRow } from "@/modules/analysis/cohortPivot";
import { UserRole } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 21;
const ALLOWED_WINDOW_DAYS = [7, 14, 21, 28];

const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "Significant",
  EMERGING_DRIFT: "Emerging",
  STABLE: "Stable",
  LOW_COVERAGE: "Low coverage",
};

const RISK_STATUS_PILL: Record<RiskStatus, PillVariant> = {
  SIGNIFICANT_DRIFT: "error",
  EMERGING_DRIFT: "warning",
  STABLE: "success",
  LOW_COVERAGE: "neutral",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatComputedAt(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleVariant(role: UserRole): "leadership" | "hod" | "teacher" {
  if (role === "ADMIN" || role === "SLT") return "leadership";
  if (role === "HOD") return "hod";
  return "teacher";
}

// ─── Shared Header ────────────────────────────────────────────────────────────

function SharedHeader({
  windowDays,
  computedAt,
}: {
  windowDays: number;
  computedAt: Date;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <H1>Anaxi briefing</H1>
        <div className="flex flex-col gap-0.5 sm:text-right">
          <MetaText>Updated {formatComputedAt(computedAt)} · Window {windowDays}d</MetaText>
          <MetaText>Sources: Observations · Behaviour</MetaText>
        </div>
      </div>
      <hr className="border-border" />
    </div>
  );
}

// ─── Leadership Home ──────────────────────────────────────────────────────────

function LeadershipHome({
  windowDays,
  cpdRows,
  teacherRows,
  cohortRows,
  studentRows,
  topImproving,
}: {
  windowDays: number;
  cpdRows: CpdPriorityRow[];
  teacherRows: TeacherRiskRow[];
  cohortRows: CohortPivotRow[];
  studentRows: StudentRiskRow[];
  topImproving: CpdPriorityRow[];
}) {
  const topCpd = cpdRows.filter((r) => r.teachersDriftingDown > 0).slice(0, 3);
  const topTeachers = teacherRows.slice(0, 5);

  // Top 2 cohort alerts: rows with most negative attendance or highest on-calls delta
  const cohortAlerts = [...cohortRows]
    .filter((r) => r.attendanceDelta !== null || r.onCallsDelta !== null)
    .sort((a, b) => {
      const aScore =
        (a.attendanceDelta !== null ? -a.attendanceDelta : 0) +
        (a.onCallsDelta !== null ? a.onCallsDelta : 0);
      const bScore =
        (b.attendanceDelta !== null ? -b.attendanceDelta : 0) +
        (b.onCallsDelta !== null ? b.onCallsDelta : 0);
      return bScore - aScore;
    })
    .slice(0, 2);

  const urgentStudents = studentRows
    .filter((r) => r.band === "URGENT" || r.band === "PRIORITY")
    .slice(0, 8);

  const hasBehaviourData = cohortRows.length > 0 || studentRows.length > 0;
  const momentumSignals = topImproving.slice(0, 2);

  return (
    <div className="space-y-6">
      {/* 1. Instructional Movement — 7/5 col split */}
      <section className="space-y-3">
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left 7 cols: CPD priorities */}
          <div className="space-y-3 md:col-span-7">
            <SectionHeader
              title="CPD priorities"
              href={`/analysis/cpd?window=${windowDays}`}
              linkLabel="View all →"
            />
            <Card className="space-y-1">
              {topCpd.length === 0 ? (
                <MetaText>No weakening signals detected in this window.</MetaText>
              ) : (
                <ul>
                  {topCpd.map((row) => (
                    <li key={row.signalKey}>
                      <Link
                        href={`/analysis/cpd/${row.signalKey}?window=${windowDays}`}
                        className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                      >
                        <p className="text-sm font-medium text-text">{row.label}</p>
                        <MetaText>
                          {Math.round(row.driftRate * 100)}% drifting · {row.teachersCovered} covered
                        </MetaText>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Right 5 cols: Teacher support priorities */}
          <div className="space-y-3 md:col-span-5">
            <SectionHeader
              title="Teacher support priorities"
              href={`/analysis/teachers?window=${windowDays}`}
              linkLabel="View all →"
            />
            <Card className="space-y-1">
              {topTeachers.length === 0 ? (
                <MetaText>No observation data available in this window.</MetaText>
              ) : (
                <ul>
                  {topTeachers.map((row) => (
                    <li key={row.teacherMembershipId}>
                      <Link
                        href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                        className="flex items-start justify-between gap-2 rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text">{row.teacherName}</p>
                          <MetaText>
                            {[
                              row.departmentNames.length > 0 ? row.departmentNames.join(", ") : null,
                              `${row.teacherCoverage} obs`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </MetaText>
                        </div>
                        <StatusPill variant={RISK_STATUS_PILL[row.status]}>
                          {RISK_STATUS_LABELS[row.status]}
                        </StatusPill>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* 2. Pastoral Signals — 7/5 col split */}
      <section className="space-y-3">
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left 7 cols: Cohort change */}
          <div className="space-y-3 md:col-span-7">
            <SectionHeader title="Cohort change" />
            {!hasBehaviourData ? (
              <Card className="space-y-2">
                <BodyText className="text-muted">Behaviour snapshots not yet imported.</BodyText>
                <Link href="/admin/imports" className="block text-xs text-accent hover:underline">
                  Import behaviour data →
                </Link>
              </Card>
            ) : (
              <Card className="space-y-1">
                {cohortAlerts.length === 0 ? (
                  <MetaText>No significant cohort changes detected.</MetaText>
                ) : (
                  <ul>
                    {cohortAlerts.map((row) => {
                      const headline =
                        row.attendanceDelta !== null && row.attendanceDelta < -0.5
                          ? `${row.yearGroup} attendance ↓`
                          : row.onCallsDelta !== null && row.onCallsDelta > 0.1
                          ? `${row.yearGroup} on-calls ↑`
                          : row.yearGroup ?? "Year group";
                      const delta =
                        row.attendanceDelta !== null && row.attendanceDelta < -0.5
                          ? `${Math.abs(row.attendanceDelta).toFixed(1)}%`
                          : row.onCallsDelta !== null && row.onCallsDelta > 0.1
                          ? `+${row.onCallsDelta.toFixed(1)}`
                          : null;
                      return (
                        <li key={row.yearGroup}>
                          <Link
                            href={`/explorer?view=BEHAVIOUR_COHORTS_PIVOT&year=${encodeURIComponent(row.yearGroup ?? "")}&window=${windowDays}`}
                            className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                          >
                            <p className="text-sm font-medium text-text">{headline}</p>
                            <MetaText>
                              {[
                                delta,
                                `${row.studentsCovered} students`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </MetaText>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            )}
          </div>

          {/* Right 5 cols: Student support priorities */}
          <div className="space-y-3 md:col-span-5">
            <SectionHeader
              title="Student support priorities"
              href={`/analysis/students?window=${windowDays}`}
              linkLabel="View all →"
            />
            <Card className="space-y-1">
              {urgentStudents.length === 0 ? (
                <MetaText>No urgent or priority students in this window.</MetaText>
              ) : (
                <ul>
                  {urgentStudents.map((row) => (
                    <li key={row.studentId}>
                      <Link
                        href={`/analysis/students/${row.studentId}?window=${windowDays}`}
                        className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text">{row.studentName}</p>
                            {row.yearGroup && <MetaText>{row.yearGroup}</MetaText>}
                          </div>
                          <StatusPill variant={row.band === "URGENT" ? "error" : "warning"}>
                            {row.band === "URGENT" ? "Urgent" : "Priority"}
                          </StatusPill>
                        </div>
                        {row.drivers.length > 0 && (
                          <div className="mt-1">
                            <DriverChips drivers={row.drivers} max={2} />
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Positive Momentum — full width, 6/6 */}
      {momentumSignals.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Positive momentum" />
          <div className="grid gap-4 sm:grid-cols-2">
            {momentumSignals.map((row) => (
              <Link
                key={row.signalKey}
                href={`/analysis/cpd/${row.signalKey}?window=${windowDays}`}
                className="block rounded-lg border border-border bg-surface p-4 shadow-sm hover:border-accentHover calm-transition transition duration-200 ease-calm"
              >
                <p className="text-sm font-medium text-text">{row.label}</p>
                <MetaText className="mt-1">
                  {Math.round(row.improvingRate * 100)}% improving · {row.teachersCovered} covered
                </MetaText>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer links */}
      <div className="flex gap-4">
        <Link href="/explorer" className="text-sm text-accent hover:underline">
          Open Explorer →
        </Link>
      </div>
    </div>
  );
}

// ─── HOD Home ─────────────────────────────────────────────────────────────────

function HodHome({
  windowDays,
  deptCpdRows,
  deptTeacherRows,
  deptName,
  deptId,
  selfProfile,
  wholeSchoolTop1,
  userId,
  allDepts,
  activeDeptId,
}: {
  windowDays: number;
  deptCpdRows: CpdPriorityRow[];
  deptTeacherRows: TeacherRiskRow[];
  deptName: string;
  deptId: string;
  selfProfile: Awaited<ReturnType<typeof computeTeacherSignalProfile>>;
  wholeSchoolTop1: CpdPriorityRow | null;
  userId: string;
  allDepts: { id: string; name: string }[];
  activeDeptId: string;
}) {
  const topDeptCpd = deptCpdRows.filter((r) => r.teachersDriftingDown > 0).slice(0, 2);
  const topDeptTeachers = deptTeacherRows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Department movement — full width with 6/6 inner cols */}
      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <H2>Department movement — {deptName}</H2>
          {allDepts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {allDepts.map((d) => (
                <Link
                  key={d.id}
                  href={`/home?dept=${d.id}&window=${windowDays}`}
                  className={`rounded-full border px-3 py-1 text-xs calm-transition transition duration-200 ease-calm ${
                    d.id === activeDeptId
                      ? "border-accent bg-[var(--accent-tint)] text-text"
                      : "border-border text-muted hover:border-accentHover"
                  }`}
                >
                  {d.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Card>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Dept CPD priorities */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text">CPD priorities</p>
              {topDeptCpd.length === 0 ? (
                <MetaText>No weakening signals detected in this window.</MetaText>
              ) : (
                <ul className="space-y-1">
                  {topDeptCpd.map((row) => (
                    <li key={row.signalKey}>
                      <Link
                        href={`/analysis/cpd/${row.signalKey}?window=${windowDays}&department=${deptId}`}
                        className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                      >
                        <p className="text-sm font-medium text-text">{row.label}</p>
                        <MetaText>
                          {Math.round(row.driftRate * 100)}% drifting · {row.teachersCovered} covered
                        </MetaText>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/analysis/cpd?window=${windowDays}&department=${deptId}`}
                className="block text-xs text-accent hover:underline"
              >
                View dept CPD →
              </Link>
            </div>

            {/* Right: Dept teacher priorities */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text">Teacher priorities</p>
              {topDeptTeachers.length === 0 ? (
                <MetaText>No observation data for your department in this window.</MetaText>
              ) : (
                <ul className="space-y-1">
                  {topDeptTeachers.map((row) => (
                    <li key={row.teacherMembershipId}>
                      <Link
                        href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                      >
                        <div>
                          <span className="text-sm font-medium text-text">{row.teacherName}</span>
                          <MetaText>{row.teacherCoverage} obs</MetaText>
                        </div>
                        <StatusPill variant={RISK_STATUS_PILL[row.status]}>
                          {RISK_STATUS_LABELS[row.status]}
                        </StatusPill>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/analysis/teachers?window=${windowDays}&department=${deptId}`}
                className="block text-xs text-accent hover:underline"
              >
                View dept teachers →
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Your recent observations */}
      <section className="space-y-3">
        <H2>Your recent observations</H2>
        <Card className="space-y-3">
          {!selfProfile || selfProfile.teacherCoverage === 0 ? (
            <div className="space-y-2">
              <BodyText className="text-muted">No observations captured yet.</BodyText>
              <Link href="/observe/new" className="block text-xs text-accent hover:underline">
                Start an observation →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <MetaText>
                {selfProfile.teacherCoverage} observation{selfProfile.teacherCoverage !== 1 ? "s" : ""} in last {windowDays} days
                {selfProfile.lastObservationAt && (
                  <> · Last: {new Date(selfProfile.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                )}
              </MetaText>

              {/* Strengths + Areas to watch in two inner columns */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Strengths: top 3 signals */}
                <div className="space-y-1.5">
                  <MetaText className="font-medium text-text">Strengths</MetaText>
                  <div className="flex flex-wrap gap-1">
                    {selfProfile.signals
                      .filter((s) => s.currentMean !== null)
                      .sort((a, b) => (b.currentMean ?? 0) - (a.currentMean ?? 0))
                      .slice(0, 3)
                      .map((sig) => (
                        <span
                          key={sig.signalKey}
                          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text"
                        >
                          {sig.label}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Areas to watch: up to 2 chips (only if coverage eligible) */}
                {selfProfile.teacherCoverage >= 3 && (
                  <div className="space-y-1.5">
                    <MetaText className="font-medium text-text">Areas to watch</MetaText>
                    <div className="flex flex-wrap gap-1">
                      {selfProfile.signals
                        .filter((s) => s.delta !== null && s.delta < 0)
                        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
                        .slice(0, 2)
                        .map((sig) => (
                          <span
                            key={sig.signalKey}
                            className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-[var(--warning)]"
                          >
                            {sig.label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/analysis/teachers/${userId}?window=${windowDays}`}
                  className="text-xs text-accent hover:underline"
                >
                  View your signal profile →
                </Link>
                <Link
                  href={`/observe/history?teacherId=${userId}&window=${windowDays}`}
                  className="text-xs text-accent hover:underline"
                >
                  View observations →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* 3. Whole-school focus (light) */}
      {wholeSchoolTop1 && (
        <section className="space-y-3">
          <H2>Whole-school focus</H2>
          <Card className="space-y-2">
            <p className="text-sm font-medium text-text">
              Focus area: {wholeSchoolTop1.label}
            </p>
            <MetaText>
              {Math.round(wholeSchoolTop1.driftRate * 100)}% of covered teachers ·{" "}
              {wholeSchoolTop1.teachersCovered} covered
            </MetaText>
            <Link
              href={`/analysis/cpd?window=${windowDays}`}
              className="block text-xs text-accent hover:underline"
            >
              See CPD priorities →
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}

// ─── Teacher Home ─────────────────────────────────────────────────────────────

function TeacherHome({
  windowDays,
  selfProfile,
  openActions,
  loaRequest,
  onCallRequests,
  wholeSchoolTop1,
  userId,
  hasMeetingsFeature,
  hasLeaveFeature,
  hasOnCallFeature,
}: {
  windowDays: number;
  selfProfile: Awaited<ReturnType<typeof computeTeacherSignalProfile>>;
  openActions: any[];
  loaRequest: any | null;
  onCallRequests: any[];
  wholeSchoolTop1: CpdPriorityRow | null;
  userId: string;
  hasMeetingsFeature: boolean;
  hasLeaveFeature: boolean;
  hasOnCallFeature: boolean;
}) {
  const signalsWithData = selfProfile?.signals.filter((s) => s.currentMean !== null) ?? [];
  const strengthSignals = [...signalsWithData]
    .sort((a, b) => (b.currentMean ?? 0) - (a.currentMean ?? 0))
    .slice(0, 3);
  const watchSignals = [...signalsWithData]
    .filter((s) => s.delta !== null && s.delta < 0 && (selfProfile?.teacherCoverage ?? 0) >= 3)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, 2);

  const loaStatusLabel: Record<string, string> = {
    PENDING: "Pending review",
    APPROVED: "Approved",
    DENIED: "Not approved",
    CANCELLED: "Cancelled",
  };

  const loaStatusPill: Record<string, PillVariant> = {
    PENDING: "neutral",
    APPROVED: "success",
    DENIED: "error",
    CANCELLED: "neutral",
  };

  return (
    <div className="space-y-6">
      {/* 1. Your recent observations */}
      <section className="space-y-3">
        <H2>Your recent observations</H2>
        <Card className="space-y-3">
          {!selfProfile || selfProfile.teacherCoverage === 0 ? (
            <div className="space-y-2">
              <BodyText className="text-muted">No observations captured yet in this window.</BodyText>
              <Link href="/observe/new" className="block text-xs text-accent hover:underline">
                Start an observation →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <MetaText>
                {selfProfile.teacherCoverage} observation{selfProfile.teacherCoverage !== 1 ? "s" : ""} in last {windowDays} days
                {selfProfile.lastObservationAt && (
                  <> · Last: {new Date(selfProfile.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                )}
              </MetaText>

              {/* Strengths + Areas to watch in two inner columns */}
              <div className="grid gap-4 sm:grid-cols-2">
                {strengthSignals.length > 0 && (
                  <div className="space-y-1.5">
                    <MetaText className="font-medium text-text">Strengths</MetaText>
                    <div className="flex flex-wrap gap-1">
                      {strengthSignals.map((sig) => (
                        <span
                          key={sig.signalKey}
                          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text"
                        >
                          {sig.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {watchSignals.length > 0 && (
                  <div className="space-y-1.5">
                    <MetaText className="font-medium text-text">Areas to watch</MetaText>
                    <div className="flex flex-wrap gap-1">
                      {watchSignals.map((sig) => (
                        <span
                          key={sig.signalKey}
                          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-[var(--warning)]"
                        >
                          {sig.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/analysis/teachers/${userId}?window=${windowDays}`}
                  className="text-xs text-accent hover:underline"
                >
                  View your signal profile →
                </Link>
                <Link
                  href={`/observe/history?teacherId=${userId}&window=${windowDays}`}
                  className="text-xs text-accent hover:underline"
                >
                  View observations →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* 2. Your actions */}
      {hasMeetingsFeature && (
        <section className="space-y-3">
          <H2>Your actions</H2>
          <Card className="space-y-2">
            {openActions.length === 0 ? (
              <MetaText>No open actions assigned to you.</MetaText>
            ) : (
              <ul className="space-y-2">
                {openActions.slice(0, 5).map((action: any) => (
                  <li key={action.id}>
                    <Link
                      href={`/my-actions`}
                      className="flex items-start justify-between gap-2 rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                    >
                      <span className="text-sm text-text">{action.description}</span>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {action.dueDate && (
                          <MetaText>
                            Due {new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </MetaText>
                        )}
                        <StatusPill variant={action.status === "OPEN" ? "neutral" : "success"}>
                          {action.status ?? "Open"}
                        </StatusPill>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/my-actions" className="block text-xs text-accent hover:underline">
              View all actions →
            </Link>
          </Card>
        </section>
      )}

      {/* 3. Admin status — 6/6 grid */}
      {(hasLeaveFeature || hasOnCallFeature) && (
        <section className="space-y-3">
          <H2>Admin status</H2>
          <div className="grid gap-4 sm:grid-cols-2">
            {hasLeaveFeature && (
              <Card className="space-y-2">
                <p className="text-sm font-semibold text-text">Leave of absence</p>
                {loaRequest ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <BodyText className="text-sm">
                        {new Date(loaRequest.startAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {" – "}
                        {new Date(loaRequest.endAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </BodyText>
                      <StatusPill variant={loaStatusPill[loaRequest.status] ?? "neutral"}>
                        {loaStatusLabel[loaRequest.status] ?? loaRequest.status}
                      </StatusPill>
                    </div>
                  </div>
                ) : (
                  <MetaText>No recent requests.</MetaText>
                )}
                <Link href="/leave" className="block text-xs text-accent hover:underline">
                  Leave requests →
                </Link>
              </Card>
            )}
            {hasOnCallFeature && (
              <Card className="space-y-2">
                <p className="text-sm font-semibold text-text">On call</p>
                {onCallRequests.length === 0 ? (
                  <MetaText>No recent on-call requests.</MetaText>
                ) : (
                  <ul className="space-y-1">
                    {onCallRequests.slice(0, 3).map((req: any) => (
                      <li key={req.id}>
                        <Link
                          href="/on-call"
                          className="flex items-center justify-between rounded-md p-1 hover:bg-bg calm-transition"
                        >
                          <MetaText>
                            {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </MetaText>
                          <StatusPill variant={req.status === "OPEN" ? "neutral" : req.status === "APPROVED" ? "success" : "error"}>
                            {req.status}
                          </StatusPill>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/on-call" className="block text-xs text-accent hover:underline">
                  On-call requests →
                </Link>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* 4. Whole-school focus (light) */}
      {wholeSchoolTop1 && (
        <section className="space-y-3">
          <H2>Whole-school focus</H2>
          <Card className="space-y-2">
            <p className="text-sm font-medium text-text">
              Focus area: {wholeSchoolTop1.label}
            </p>
            <MetaText>School-wide signal movement this window.</MetaText>
            <Link
              href={`/analysis/cpd?window=${windowDays}`}
              className="block text-xs text-accent hover:underline"
            >
              See CPD priorities →
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const user = await getSessionUserOrThrow();
  const variant = roleVariant(user.role);

  // windowDays from query param or tenant settings
  const settings = await (prisma as any).tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
  });
  const rawWindow = typeof searchParams?.window === "string" ? parseInt(searchParams.window, 10) : NaN;
  const windowDays: number = ALLOWED_WINDOW_DAYS.includes(rawWindow)
    ? rawWindow
    : (settings?.defaultInsightWindowDays ?? DEFAULT_WINDOW_DAYS);

  // Get enabled features
  const features = await (prisma as any).tenantFeature.findMany({
    where: { tenantId: user.tenantId, enabled: true },
  });
  const enabledFeatures = new Set<string>((features as any[]).map((f: any) => f.key as string));
  const hasMeetingsFeature = enabledFeatures.has("MEETINGS");
  const hasLeaveFeature = enabledFeatures.has("LEAVE") || enabledFeatures.has("LEAVE_OF_ABSENCE");
  const hasOnCallFeature = enabledFeatures.has("ON_CALL");
  const hasAnalysisFeature = enabledFeatures.has("ANALYSIS");

  const computedAt = new Date();

  const pageContent = async () => {
    // ── Leadership ──────────────────────────────────────────────────────────
    if (variant === "leadership") {
      if (!hasAnalysisFeature) {
        return (
          <Card>
            <BodyText className="text-muted">Analysis features are not yet enabled.</BodyText>
          </Card>
        );
      }

      const [cpdRows, teacherRisk, cohortResult, studentResult] = await Promise.all([
        computeCpdPriorities(user.tenantId, windowDays),
        computeTeacherRiskIndex(user.tenantId, windowDays),
        computeCohortPivot(user.tenantId, windowDays),
        computeStudentRiskIndex(user.tenantId, windowDays, user.id),
      ]);

      const topImproving = getTopImprovingSignals(cpdRows);

      return (
        <LeadershipHome
          windowDays={windowDays}
          cpdRows={cpdRows}
          teacherRows={teacherRisk}
          cohortRows={cohortResult.rows}
          studentRows={studentResult.rows}
          topImproving={topImproving}
        />
      );
    }

    // ── HOD ──────────────────────────────────────────────────────────────────
    if (variant === "hod") {
      const hodMemberships = await (prisma as any).departmentMembership.findMany({
        where: { userId: user.id, isHeadOfDepartment: true },
        include: { department: true },
      });

      const allDepts: { id: string; name: string }[] = (hodMemberships as any[]).map((m: any) => ({
        id: m.departmentId as string,
        name: m.department.name as string,
      }));

      // Active dept from query param or first
      const rawDept = typeof searchParams?.dept === "string" ? searchParams.dept : null;
      const activeDeptId: string | null =
        rawDept && allDepts.find((d) => d.id === rawDept) ? rawDept : allDepts[0]?.id ?? null;

      if (!hasAnalysisFeature || !activeDeptId) {
        return (
          <Card>
            <BodyText className="text-muted">
              {!activeDeptId
                ? "No department head assignment found. Contact your administrator."
                : "Analysis features are not yet enabled."}
            </BodyText>
          </Card>
        );
      }

      const deptName = allDepts.find((d) => d.id === activeDeptId)?.name ?? "";

      const [deptCpdRows, deptTeacherRows, selfProfile, wholeSchoolCpd] = await Promise.all([
        computeCpdPriorities(user.tenantId, windowDays, { departmentId: activeDeptId }),
        computeTeacherRiskIndex(user.tenantId, windowDays),
        computeTeacherSignalProfile(user.tenantId, user.id, windowDays),
        computeCpdPriorities(user.tenantId, windowDays),
      ]);

      // Filter teacher rows to active department
      const deptMemberships = await (prisma as any).departmentMembership.findMany({
        where: { tenantId: user.tenantId, departmentId: activeDeptId },
      });
      const deptUserIds = new Set<string>(
        (deptMemberships as any[]).map((m: any) => m.userId as string)
      );
      const filteredTeacherRows = (deptTeacherRows as TeacherRiskRow[]).filter((r) =>
        deptUserIds.has(r.teacherMembershipId)
      );

      const wholeSchoolTop1 = wholeSchoolCpd.find((r) => r.teachersDriftingDown > 0) ?? null;

      return (
        <HodHome
          windowDays={windowDays}
          deptCpdRows={deptCpdRows}
          deptTeacherRows={filteredTeacherRows}
          deptName={deptName}
          deptId={activeDeptId}
          selfProfile={selfProfile}
          wholeSchoolTop1={wholeSchoolTop1}
          userId={user.id}
          allDepts={allDepts}
          activeDeptId={activeDeptId}
        />
      );
    }

    // ── Teacher ──────────────────────────────────────────────────────────────
    const [selfProfile, wholeSchoolCpd, loaData, onCallData, openActionsData] = await Promise.all([
      hasAnalysisFeature
        ? computeTeacherSignalProfile(user.tenantId, user.id, windowDays)
        : Promise.resolve(null),
      hasAnalysisFeature
        ? computeCpdPriorities(user.tenantId, windowDays)
        : Promise.resolve([]),
      hasLeaveFeature
        ? (prisma as any).lOARequest.findFirst({
            where: { tenantId: user.tenantId, requesterId: user.id },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
      hasOnCallFeature
        ? (prisma as any).onCallRequest.findMany({
            where: { tenantId: user.tenantId, requesterUserId: user.id },
            orderBy: { createdAt: "desc" },
            take: 3,
          })
        : Promise.resolve([]),
      hasMeetingsFeature
        ? (prisma as any).meetingAction.findMany({
            where: { tenantId: user.tenantId, ownerUserId: user.id, status: "OPEN" },
            orderBy: [{ dueDate: "asc" }],
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    const wholeSchoolTop1 =
      (wholeSchoolCpd as CpdPriorityRow[]).find((r) => r.teachersDriftingDown > 0) ?? null;

    return (
      <TeacherHome
        windowDays={windowDays}
        selfProfile={selfProfile}
        openActions={openActionsData as any[]}
        loaRequest={loaData}
        onCallRequests={onCallData as any[]}
        wholeSchoolTop1={wholeSchoolTop1}
        userId={user.id}
        hasMeetingsFeature={hasMeetingsFeature}
        hasLeaveFeature={hasLeaveFeature}
        hasOnCallFeature={hasOnCallFeature}
      />
    );
  };

  const content = await pageContent();

  return (
    <div className="space-y-6">
      <SharedHeader windowDays={windowDays} computedAt={computedAt} />
      {content}
    </div>
  );
}
