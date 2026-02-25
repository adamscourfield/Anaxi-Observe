import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { H1, H2, BodyText, MetaText } from "@/components/ui/typography";
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

const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "Significant",
  EMERGING_DRIFT: "Emerging",
  STABLE: "Stable",
  LOW_COVERAGE: "Low coverage",
};

const RISK_STATUS_PILL: Record<RiskStatus, string> = {
  SIGNIFICANT_DRIFT: "bg-red-100 text-red-700",
  EMERGING_DRIFT: "bg-amber-100 text-amber-700",
  STABLE: "bg-green-100 text-green-700",
  LOW_COVERAGE: "bg-slate-100 text-slate-500",
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
    <div className="space-y-1">
      <H1>Anaxi briefing</H1>
      <MetaText>
        Updated {formatComputedAt(computedAt)} · Window: last {windowDays} days · Coverage
        thresholds applied
      </MetaText>
      <MetaText>Sources: Observations · Behaviour snapshots</MetaText>
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
  const topTeachers = teacherRows
    .filter((r) => r.status !== "LOW_COVERAGE")
    .slice(0, 5);
  const allTeachers =
    topTeachers.length < 3
      ? teacherRows.slice(0, 5)
      : topTeachers;

  // Top 2 cohort alerts: rows with the most negative attendance or highest on-calls delta
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

  return (
    <div className="space-y-8">
      {/* 1. Instructional Movement */}
      <section className="space-y-3">
        <H2>Instructional movement</H2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* CPD Priorities */}
          <Card className="space-y-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-text">CPD priorities</p>
              <MetaText>Top weakening signals across staff</MetaText>
            </div>
            {topCpd.length === 0 ? (
              <MetaText>No weakening signals detected in this window.</MetaText>
            ) : (
              <ul className="space-y-2">
                {topCpd.map((row) => (
                  <li key={row.signalKey}>
                    <Link
                      href={`/analysis/cpd/${row.signalKey}?window=${windowDays}`}
                      className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text">{row.label}</span>
                        <span className="text-xs tabular-nums text-muted">
                          {Math.round(row.driftRate * 100)}% drifting
                        </span>
                      </div>
                      <MetaText>{row.teachersCovered} teacher{row.teachersCovered !== 1 ? "s" : ""} covered</MetaText>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/analysis/cpd?window=${windowDays}`}
              className="block text-xs text-accent hover:underline"
            >
              View all CPD signals →
            </Link>
          </Card>

          {/* Teacher Support Priorities */}
          <Card className="space-y-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-text">Teacher support priorities</p>
              <MetaText>Staff with signal movement patterns</MetaText>
            </div>
            {allTeachers.length === 0 ? (
              <MetaText>No observation data available in this window.</MetaText>
            ) : (
              <ul className="space-y-1">
                {allTeachers.map((row) => (
                  <li key={row.teacherMembershipId}>
                    <Link
                      href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`}
                      className="flex items-center justify-between rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                    >
                      <div>
                        <span className="text-sm font-medium text-text">{row.teacherName}</span>
                        {row.departmentNames.length > 0 && (
                          <MetaText>{row.departmentNames.join(", ")}</MetaText>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_STATUS_PILL[row.status]}`}
                        >
                          {RISK_STATUS_LABELS[row.status]}
                        </span>
                        <MetaText>{row.teacherCoverage} obs</MetaText>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/analysis/teachers?window=${windowDays}`}
              className="block text-xs text-accent hover:underline"
            >
              View all teachers →
            </Link>
          </Card>
        </div>
      </section>

      {/* 2. Pastoral Signals */}
      <section className="space-y-3">
        <H2>Pastoral signals</H2>
        {!hasBehaviourData ? (
          <Card>
            <BodyText className="text-muted">Behaviour snapshots not yet imported.</BodyText>
            <Link
              href="/admin/imports"
              className="mt-2 block text-xs text-accent hover:underline"
            >
              Import behaviour data →
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cohort Change */}
            <Card className="space-y-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-text">Cohort change</p>
                <MetaText>Year group movement this window</MetaText>
              </div>
              {cohortAlerts.length === 0 ? (
                <MetaText>No significant cohort changes detected.</MetaText>
              ) : (
                <ul className="space-y-2">
                  {cohortAlerts.map((row) => {
                    const signals: string[] = [];
                    if (row.attendanceDelta !== null && row.attendanceDelta < -0.5)
                      signals.push(`Attendance ${row.attendanceDelta > 0 ? "↑" : "↓"} ${Math.abs(row.attendanceDelta).toFixed(1)}%`);
                    if (row.onCallsDelta !== null && row.onCallsDelta > 0.1)
                      signals.push(`On-calls ↑ ${row.onCallsDelta.toFixed(1)}`);
                    return (
                      <li key={row.yearGroup}>
                        <Link
                          href={`/explorer?view=BEHAVIOUR_COHORTS_PIVOT&year=${encodeURIComponent(row.yearGroup)}&window=${windowDays}`}
                          className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text">{row.yearGroup}</span>
                            <MetaText>{row.studentsCovered} students</MetaText>
                          </div>
                          {signals.length > 0 && (
                            <MetaText>{signals.join(" · ")}</MetaText>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href={`/explorer?view=BEHAVIOUR_COHORTS_PIVOT&window=${windowDays}`}
                className="block text-xs text-accent hover:underline"
              >
                View cohort data →
              </Link>
            </Card>

            {/* Student Support Priorities */}
            <Card className="space-y-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-text">Student support priorities</p>
                <MetaText>Students with urgent or priority pastoral signals</MetaText>
              </div>
              {urgentStudents.length === 0 ? (
                <MetaText>No urgent or priority students in this window.</MetaText>
              ) : (
                <ul className="space-y-1">
                  {urgentStudents.map((row) => (
                    <li key={row.studentId}>
                      <Link
                        href={`/analysis/students/${row.studentId}?window=${windowDays}`}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                      >
                        <div>
                          <span className="text-sm font-medium text-text">{row.studentName}</span>
                          {row.yearGroup && <MetaText>{row.yearGroup}</MetaText>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.band === "URGENT"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.band === "URGENT" ? "Urgent" : "Priority"}
                          </span>
                          {row.drivers.length > 0 && (
                            <MetaText>{row.drivers.slice(0, 2).map((d) => d.label).join(", ")}</MetaText>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/analysis/students?window=${windowDays}`}
                className="block text-xs text-accent hover:underline"
              >
                View all students →
              </Link>
            </Card>
          </div>
        )}
      </section>

      {/* 3. Positive Momentum */}
      {topImproving.length > 0 && (
        <section className="space-y-3">
          <H2>Positive momentum</H2>
          <div className="grid gap-3 sm:grid-cols-2">
            {topImproving.map((row) => (
              <Link
                key={row.signalKey}
                href={`/analysis/cpd/${row.signalKey}?window=${windowDays}`}
                className="block rounded-lg border border-border bg-surface p-4 shadow-sm hover:border-accentHover calm-transition transition duration-200 ease-calm"
              >
                <p className="text-sm font-medium text-text">{row.label}</p>
                <div className="mt-1.5 space-y-0.5">
                  <MetaText>
                    {Math.round(row.improvingRate * 100)}% of teachers improving
                  </MetaText>
                  <MetaText>{row.teachersCovered} teachers covered</MetaText>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Explore link */}
      <div>
        <Link href="/explorer" className="text-sm text-accent hover:underline">
          Explore data →
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
}: {
  windowDays: number;
  deptCpdRows: CpdPriorityRow[];
  deptTeacherRows: TeacherRiskRow[];
  deptName: string;
  deptId: string;
  selfProfile: Awaited<ReturnType<typeof computeTeacherSignalProfile>>;
  wholeSchoolTop1: CpdPriorityRow | null;
  userId: string;
}) {
  const topDeptCpd = deptCpdRows.filter((r) => r.teachersDriftingDown > 0).slice(0, 2);
  const topDeptTeachers = deptTeacherRows
    .filter((r) => r.status !== "LOW_COVERAGE")
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* 1. Department Movement */}
      <section className="space-y-3">
        <H2>Department movement — {deptName}</H2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Dept CPD */}
          <Card className="space-y-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-text">CPD priorities</p>
              <MetaText>Weakening signals in your department</MetaText>
            </div>
            {topDeptCpd.length === 0 ? (
              <MetaText>No weakening signals detected in this window.</MetaText>
            ) : (
              <ul className="space-y-2">
                {topDeptCpd.map((row) => (
                  <li key={row.signalKey}>
                    <Link
                      href={`/analysis/cpd/${row.signalKey}?window=${windowDays}&department=${deptId}`}
                      className="block rounded-md p-2 hover:bg-bg calm-transition transition duration-200 ease-calm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text">{row.label}</span>
                        <span className="text-xs tabular-nums text-muted">
                          {Math.round(row.driftRate * 100)}% drifting
                        </span>
                      </div>
                      <MetaText>{row.teachersCovered} teacher{row.teachersCovered !== 1 ? "s" : ""} covered</MetaText>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/analysis/cpd?window=${windowDays}&department=${deptId}`}
              className="block text-xs text-accent hover:underline"
            >
              View department CPD →
            </Link>
          </Card>

          {/* Dept Teachers */}
          <Card className="space-y-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-text">Department teachers</p>
              <MetaText>Signal movement patterns this window</MetaText>
            </div>
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
                      <span className="text-sm font-medium text-text">{row.teacherName}</span>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_STATUS_PILL[row.status]}`}
                        >
                          {RISK_STATUS_LABELS[row.status]}
                        </span>
                        <MetaText>{row.teacherCoverage} obs</MetaText>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/analysis/teachers?window=${windowDays}&department=${deptId}`}
              className="block text-xs text-accent hover:underline"
            >
              View all department teachers →
            </Link>
          </Card>
        </div>
      </section>

      {/* 2. Your Recent Observations */}
      <section className="space-y-3">
        <H2>Your recent observations</H2>
        <Card className="space-y-3">
          {!selfProfile || selfProfile.teacherCoverage === 0 ? (
            <div className="space-y-2">
              <BodyText className="text-muted">No observations captured yet.</BodyText>
              <Link
                href="/observe/new"
                className="block text-xs text-accent hover:underline"
              >
                Start an observation →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <MetaText>
                  {selfProfile.teacherCoverage} observation{selfProfile.teacherCoverage !== 1 ? "s" : ""} in window
                </MetaText>
                {selfProfile.lastObservationAt && (
                  <MetaText>
                    Last: {new Date(selfProfile.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </MetaText>
                )}
              </div>

              {/* Top signals with data */}
              {selfProfile.signals.filter((s) => s.currentMean !== null).length > 0 && (
                <div className="space-y-1.5">
                  <MetaText className="font-medium">Signal movement</MetaText>
                  {selfProfile.signals
                    .filter((s) => s.currentMean !== null)
                    .slice(0, 4)
                    .map((sig) => (
                      <div key={sig.signalKey} className="flex items-center justify-between">
                        <span className="text-xs text-text">{sig.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums text-muted">
                            {sig.currentMean?.toFixed(1)}
                          </span>
                          {sig.delta !== null && (
                            <span
                              className={`text-xs tabular-nums ${
                                sig.delta > 0 ? "text-green-600" : sig.delta < 0 ? "text-amber-600" : "text-muted"
                              }`}
                            >
                              {sig.delta > 0 ? "+" : ""}
                              {sig.delta.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <Link
                href={`/analysis/teachers/${userId}?window=${windowDays}`}
                className="block text-xs text-accent hover:underline"
              >
                View your signal profile →
              </Link>
            </div>
          )}
        </Card>
      </section>

      {/* 3. Whole-school Focus */}
      {wholeSchoolTop1 && (
        <section className="space-y-3">
          <H2>Whole-school focus</H2>
          <Card>
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-text">{wholeSchoolTop1.label}</p>
                <MetaText>Most widespread weakening signal school-wide</MetaText>
                <MetaText>
                  {Math.round(wholeSchoolTop1.driftRate * 100)}% of covered teachers ·{" "}
                  {wholeSchoolTop1.teachersCovered} covered
                </MetaText>
              </div>
            </div>
            <Link
              href={`/analysis/cpd?window=${windowDays}`}
              className="mt-3 block text-xs text-accent hover:underline"
            >
              View whole-school CPD →
            </Link>
          </Card>
        </section>
      )}

      {/* Explore link */}
      <div>
        <Link href="/explorer" className="text-sm text-accent hover:underline">
          Explore data →
        </Link>
      </div>
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
  // Top 3 strongest (highest currentMean)
  const strongSignals = [...signalsWithData]
    .sort((a, b) => (b.currentMean ?? 0) - (a.currentMean ?? 0))
    .slice(0, 3);
  // Up to 2 areas to watch (most negative delta, only if delta exists)
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

  return (
    <div className="space-y-8">
      {/* 1. Your Recent Observations */}
      <section className="space-y-3">
        <H2>Your recent observations</H2>
        <Card className="space-y-3">
          {!selfProfile || selfProfile.teacherCoverage === 0 ? (
            <div className="space-y-2">
              <BodyText className="text-muted">No observations captured yet in this window.</BodyText>
              <Link
                href="/observe/new"
                className="block text-xs text-accent hover:underline"
              >
                Start an observation →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <MetaText>
                  {selfProfile.teacherCoverage} observation{selfProfile.teacherCoverage !== 1 ? "s" : ""} in window
                </MetaText>
                {selfProfile.lastObservationAt && (
                  <MetaText>
                    Last: {new Date(selfProfile.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </MetaText>
                )}
              </div>

              {strongSignals.length > 0 && (
                <div className="space-y-1.5">
                  <MetaText className="font-medium text-text">Strongest signals</MetaText>
                  {strongSignals.map((sig) => (
                    <div key={sig.signalKey} className="flex items-center justify-between">
                      <span className="text-xs text-text">{sig.label}</span>
                      <span className="text-xs tabular-nums text-muted">
                        {sig.currentMean?.toFixed(1)} / 4
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {watchSignals.length > 0 && (
                <div className="space-y-1.5">
                  <MetaText className="font-medium text-text">Areas to watch</MetaText>
                  {watchSignals.map((sig) => (
                    <div key={sig.signalKey} className="flex items-center justify-between">
                      <span className="text-xs text-text">{sig.label}</span>
                      <span className="text-xs tabular-nums text-amber-600">
                        {sig.delta !== null && sig.delta < 0 ? sig.delta.toFixed(2) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

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

      {/* 2. Your Actions */}
      {hasMeetingsFeature && (
        <section className="space-y-3">
          <H2>Your actions</H2>
          <Card className="space-y-3">
            {openActions.length === 0 ? (
              <MetaText>No open actions assigned to you.</MetaText>
            ) : (
              <ul className="space-y-2">
                {openActions.slice(0, 5).map((action: any) => (
                  <li key={action.id} className="flex items-start justify-between gap-2">
                    <span className="text-sm text-text">{action.description}</span>
                    {action.dueDate && (
                      <MetaText className="shrink-0">
                        Due {new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </MetaText>
                    )}
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

      {/* 3. Admin Status */}
      {(hasLeaveFeature || hasOnCallFeature) && (
        <section className="space-y-3">
          <H2>Admin status</H2>
          <div className="grid gap-3 sm:grid-cols-2">
            {hasLeaveFeature && (
              <Card className="space-y-2">
                <p className="text-sm font-semibold text-text">Leave of absence</p>
                {loaRequest ? (
                  <div className="space-y-0.5">
                    <BodyText>
                      {new Date(loaRequest.startAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(loaRequest.endAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </BodyText>
                    <MetaText>
                      {loaStatusLabel[loaRequest.status] ?? loaRequest.status}
                    </MetaText>
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
                        <MetaText>
                          {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {req.status}
                        </MetaText>
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

      {/* 4. Whole-school Focus */}
      {wholeSchoolTop1 && (
        <section className="space-y-3">
          <H2>Whole-school focus</H2>
          <Card>
            <p className="text-sm font-medium text-text">
              Focus area: {wholeSchoolTop1.label}
            </p>
            <Link
              href={`/analysis/cpd?window=${windowDays}`}
              className="mt-2 block text-xs text-accent hover:underline"
            >
              View CPD overview →
            </Link>
          </Card>
        </section>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const user = await getSessionUserOrThrow();
  const variant = roleVariant(user.role);

  // Get settings for windowDays
  const settings = await (prisma as any).tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
  });
  const windowDays: number = settings?.defaultInsightWindowDays ?? DEFAULT_WINDOW_DAYS;

  // Get enabled features
  const features = await (prisma as any).tenantFeature.findMany({
    where: { tenantId: user.tenantId, enabled: true },
  });
  const enabledFeatures = new Set<string>((features as any[]).map((f: any) => f.key as string));
  const hasMeetingsFeature = enabledFeatures.has("MEETINGS");
  const hasLeaveFeature = enabledFeatures.has("LEAVE") || enabledFeatures.has("LEAVE_OF_ABSENCE");
  const hasOnCallFeature = enabledFeatures.has("ON_CALL");
  const hasAnalysisFeature = enabledFeatures.has("ANALYSIS");
  const hasStudentAnalysis = enabledFeatures.has("STUDENT_ANALYSIS");

  const computedAt = new Date();

  // ── Leadership ───────────────────────────────────────────────────────────────
  if (variant === "leadership") {
    if (!hasAnalysisFeature) {
      return (
        <div className="space-y-6">
          <SharedHeader windowDays={windowDays} computedAt={computedAt} />
          <Card>
            <BodyText className="text-muted">Analysis features are not yet enabled.</BodyText>
          </Card>
        </div>
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
      <div className="space-y-6">
        <SharedHeader windowDays={windowDays} computedAt={computedAt} />
        <LeadershipHome
          windowDays={windowDays}
          cpdRows={cpdRows}
          teacherRows={teacherRisk}
          cohortRows={cohortResult.rows}
          studentRows={studentResult.rows}
          topImproving={topImproving}
        />
      </div>
    );
  }

  // ── HOD ───────────────────────────────────────────────────────────────────────
  if (variant === "hod") {
    // Get HOD's departments
    const hodMemberships = await (prisma as any).departmentMembership.findMany({
      where: { userId: user.id, isHeadOfDepartment: true },
      include: { department: true },
    });
    const hodDept = (hodMemberships as any[])[0] ?? null;

    if (!hasAnalysisFeature || !hodDept) {
      return (
        <div className="space-y-6">
          <SharedHeader windowDays={windowDays} computedAt={computedAt} />
          <Card>
            <BodyText className="text-muted">
              {!hodDept
                ? "No department head assignment found. Contact your administrator."
                : "Analysis features are not yet enabled."}
            </BodyText>
          </Card>
        </div>
      );
    }

    const deptId: string = hodDept.departmentId;
    const deptName: string = hodDept.department.name;

    const [deptCpdRows, deptTeacherRows, selfProfile, wholeSchoolCpd] = await Promise.all([
      computeCpdPriorities(user.tenantId, windowDays, { departmentId: deptId }),
      computeTeacherRiskIndex(user.tenantId, windowDays),
      computeTeacherSignalProfile(user.tenantId, user.id, windowDays),
      computeCpdPriorities(user.tenantId, windowDays),
    ]);

    // Filter teacher rows to department
    const deptMemberships = await (prisma as any).departmentMembership.findMany({
      where: { tenantId: user.tenantId, departmentId: deptId },
    });
    const deptUserIds = new Set<string>((deptMemberships as any[]).map((m: any) => m.userId as string));
    const filteredTeacherRows = deptTeacherRows.filter((r) =>
      deptUserIds.has(r.teacherMembershipId)
    );

    const wholeSchoolTop1 = wholeSchoolCpd.find((r) => r.teachersDriftingDown > 0) ?? null;

    return (
      <div className="space-y-6">
        <SharedHeader windowDays={windowDays} computedAt={computedAt} />
        <HodHome
          windowDays={windowDays}
          deptCpdRows={deptCpdRows}
          deptTeacherRows={filteredTeacherRows}
          deptName={deptName}
          deptId={deptId}
          selfProfile={selfProfile}
          wholeSchoolTop1={wholeSchoolTop1}
          userId={user.id}
        />
      </div>
    );
  }

  // ── Teacher ────────────────────────────────────────────────────────────────
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
    <div className="space-y-6">
      <SharedHeader windowDays={windowDays} computedAt={computedAt} />
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
    </div>
  );
}
