import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { BodyText, MetaText } from "@/components/ui/typography";
import { StatusPill, PillVariant } from "@/components/ui/status-pill";
import { DriverChips } from "@/components/ui/driver-chips";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { CpdPriorityRow } from "@/modules/analysis/cpdPriorities";
import {
  computeTeacherSignalProfile,
  TeacherRiskRow,
  RiskStatus,
} from "@/modules/analysis/teacherRisk";
import { StudentRiskRow } from "@/modules/analysis/studentRisk";
import { CohortPivotRow } from "@/modules/analysis/cohortPivot";
import { UserRole } from "@/lib/types";
import { assembleHomeCards } from "@/modules/home/assembler";
import {
  hydrateLeadershipHomeData,
  hydrateHodHomeData,
  hydrateTeacherHomeData,
} from "@/modules/home/hydration";

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

type MeetingActionSummary = { id: string; description: string; dueDate: string | null; status: string };
type LoaSummary = { startDate: string; endDate: string; status: string };
type OnCallSummary = { id: string; createdAt: string; status: string };

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

function PageTitle({
  windowDays,
  computedAt,
}: {
  windowDays: number;
  computedAt: Date;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.025em] text-text">Anaxi briefing</h1>
        <p className="mt-0.5 text-[13px] text-muted">Your personalised overview of school operations and priorities.</p>
      </div>
      <p className="text-[11px] text-muted">Updated {formatComputedAt(computedAt)} · {windowDays}d window</p>
    </div>
  );
}

function LeadershipHome({
  windowDays,
  cpdRows,
  teacherRows,
  cohortRows,
  studentRows,
  hasLeaveFeature,
  pendingLeaveCount,
  openOnCallCount,
}: {
  windowDays: number;
  cpdRows: CpdPriorityRow[];
  teacherRows: TeacherRiskRow[];
  cohortRows: CohortPivotRow[];
  studentRows: StudentRiskRow[];
  hasLeaveFeature: boolean;
  pendingLeaveCount: number;
  openOnCallCount: number;
}) {
  const allDriftingCpd = cpdRows.filter((r) => r.teachersDriftingDown > 0);
  const topCpd = allDriftingCpd.slice(0, 3);
  const topTeachers = teacherRows.slice(0, 5);
  const allUrgentStudents = studentRows.filter((r) => r.band === "URGENT" || r.band === "PRIORITY");
  const displayUrgentStudents = allUrgentStudents.slice(0, 8);
  const hasBehaviourData = cohortRows.length > 0 || studentRows.length > 0;

  const cohortAlerts = [...cohortRows]
    .filter((r) => r.attendanceDelta !== null || r.onCallsDelta !== null)
    .sort((a, b) => {
      const aScore = (a.attendanceDelta !== null ? -a.attendanceDelta : 0) + (a.onCallsDelta !== null ? a.onCallsDelta : 0);
      const bScore = (b.attendanceDelta !== null ? -b.attendanceDelta : 0) + (b.onCallsDelta !== null ? b.onCallsDelta : 0);
      return bScore - aScore;
    })
    .slice(0, 2);

  const totalObs = teacherRows.reduce((sum, r) => sum + r.teacherCoverage, 0);
  const urgentCount = allUrgentStudents.length;
  const cpdDriftCount = allDriftingCpd.length;
  const operationalCount = pendingLeaveCount + openOnCallCount;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Observations"
          value={totalObs}
          context={`${windowDays}d window · ${teacherRows.length} teachers`}
          accent="accent"
          href={`/analytics?tab=teachers&window=${windowDays}`}
        />
        <StatCard
          label="Urgent students"
          value={urgentCount}
          context={urgentCount > 0 ? "Require immediate attention" : "No urgent cases"}
          accent={urgentCount > 0 ? "error" : "success"}
          href={`/analytics?tab=students&window=${windowDays}`}
        />
        <StatCard
          label="CPD drift signals"
          value={cpdDriftCount}
          context={cpdDriftCount > 0 ? `${cpdDriftCount} signal${cpdDriftCount !== 1 ? "s" : ""} weakening` : "All signals stable"}
          accent={cpdDriftCount > 0 ? "warning" : "success"}
          href={`/analytics?tab=cpd&window=${windowDays}`}
        />
        <StatCard
          label={hasLeaveFeature && openOnCallCount > 0 ? "Pending leave / on-call" : hasLeaveFeature ? "Pending leave" : "Open on-call"}
          value={operationalCount}
          context={
            operationalCount > 0
              ? [pendingLeaveCount > 0 ? `${pendingLeaveCount} leave` : null, openOnCallCount > 0 ? `${openOnCallCount} on-call` : null].filter(Boolean).join(" · ")
              : "No pending requests"
          }
          accent={operationalCount > 0 ? "warning" : "success"}
          href={pendingLeaveCount > 0 ? "/leave/pending" : "/on-call"}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">CPD priorities</p>
            <Link href={`/analytics?tab=cpd&window=${windowDays}`} className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          {topCpd.length === 0 ? (
            <MetaText>No weakening signals detected in this window.</MetaText>
          ) : (
            <ul className="space-y-1">
              {topCpd.map((row) => (
                <li key={row.signalKey}>
                  <Link href={`/analysis/cpd/${row.signalKey}?window=${windowDays}`} className="block rounded-lg p-3 hover:bg-[#fe9f9f]/10 calm-transition">
                    <p className="text-sm font-medium text-text">{row.label}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-xs text-muted">{Math.round(row.driftRate * 100)}% drift rate</span>
                      {row.avgNegDeltaAbs !== null && (
                        <span className="text-xs text-muted">Avg Δ −{row.avgNegDeltaAbs.toFixed(2)}</span>
                      )}
                      <span className="text-xs text-muted">{row.teachersCovered} covered</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#fe9f9f]" style={{ width: `${Math.min(Math.round(row.driftRate * 100), 100)}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">Teacher Support Priorities</p>
            <Link href={`/analytics?tab=teachers&window=${windowDays}`} className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          {topTeachers.length === 0 ? (
            <MetaText>No observation data available in this window.</MetaText>
          ) : (
            <ul className="space-y-1">
              {topTeachers.map((row) => (
                <li key={row.teacherMembershipId}>
                  <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-[#fe9f9f]/10 calm-transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={row.teacherName} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{row.teacherName}</p>
                        <MetaText>{[row.departmentNames.length > 0 ? row.departmentNames.join(", ") : null, `${row.teacherCoverage} obs`].filter(Boolean).join(" · ")}</MetaText>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {row.normalizedIDS !== 0 && (
                        <span className={`text-xs tabular-nums ${row.normalizedIDS > 0 ? "text-green-600" : "text-[#fe9f9f]"}`}>
                          {row.normalizedIDS > 0 ? "+" : ""}{row.normalizedIDS.toFixed(1)}
                        </span>
                      )}
                      <StatusPill variant={RISK_STATUS_PILL[row.status]}>{RISK_STATUS_LABELS[row.status]}</StatusPill>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">Cohort Change</p>
            <Link href={`/explorer?view=BEHAVIOUR_COHORTS_PIVOT&window=${windowDays}`} className="text-[12px] text-accent hover:underline">Explorer →</Link>
          </div>
          {!hasBehaviourData ? (
            <div className="space-y-2">
              <BodyText className="text-muted">Behaviour snapshots not yet imported.</BodyText>
              <Link href="/admin/imports" className="text-[12px] text-accent hover:underline">Import behaviour data →</Link>
            </div>
          ) : cohortAlerts.length === 0 ? (
            <MetaText>No significant cohort changes detected.</MetaText>
          ) : (
            <ul className="space-y-1">
              {cohortAlerts.map((row) => (
                <li key={row.yearGroup}>
                  <Link href={`/explorer?view=BEHAVIOUR_COHORTS_PIVOT&year=${encodeURIComponent(row.yearGroup ?? "")}&window=${windowDays}`} className="block rounded-lg p-3 hover:bg-[#fe9f9f]/10 calm-transition">
                    <p className="text-sm font-medium text-text">{row.yearGroup ?? "Year group"}</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-muted">Attendance</p>
                        <p className="text-sm font-medium tabular-nums text-text">
                          {row.attendanceMean !== null ? `${row.attendanceMean.toFixed(1)}%` : "—"}
                        </p>
                        {row.attendanceDelta !== null && (
                          <p className={`text-xs tabular-nums ${row.attendanceDelta < 0 ? "text-[#fe9f9f]" : "text-green-600"}`}>
                            {row.attendanceDelta > 0 ? "+" : ""}{row.attendanceDelta.toFixed(1)}%
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted">Behaviour</p>
                        <p className="text-sm font-medium tabular-nums text-text">
                          {row.detentionsMean !== null ? row.detentionsMean.toFixed(1) : "—"}
                        </p>
                        {row.detentionsDelta !== null && (
                          <p className={`text-xs tabular-nums ${row.detentionsDelta > 0 ? "text-[#fe9f9f]" : "text-green-600"}`}>
                            {row.detentionsDelta > 0 ? "+" : ""}{row.detentionsDelta.toFixed(1)}
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted">On calls</p>
                        <p className="text-sm font-medium tabular-nums text-text">
                          {row.onCallsMean !== null ? row.onCallsMean.toFixed(1) : "—"}
                        </p>
                        {row.onCallsDelta !== null && (
                          <p className={`text-xs tabular-nums ${row.onCallsDelta > 0 ? "text-[#fe9f9f]" : "text-green-600"}`}>
                            {row.onCallsDelta > 0 ? "+" : ""}{row.onCallsDelta.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">Student Support Priorities</p>
            <Link href={`/analytics?tab=students&window=${windowDays}`} className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          {displayUrgentStudents.length === 0 ? (
            <MetaText>No urgent or priority students in this window.</MetaText>
          ) : (
            <ul className="space-y-1">
              {displayUrgentStudents.map((row) => (
                <li key={row.studentId}>
                  <Link href={`/analysis/students/${row.studentId}?window=${windowDays}`} className="block rounded-lg p-3 hover:bg-[#fe9f9f]/10 calm-transition">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium text-text truncate">
                        {row.studentName}{row.yearGroup ? <span className="ml-1 font-normal text-muted">· {row.yearGroup}</span> : null}
                      </p>
                      <StatusPill variant={row.band === "URGENT" ? "error" : "warning"}>{row.band === "URGENT" ? "Urgent" : "Priority"}</StatusPill>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {row.attendancePct !== null && (
                        <span>
                          Attendance: {row.attendancePct.toFixed(1)}%
                          {row.attendanceDelta !== null && (
                            <span className={`ml-1 ${row.attendanceDelta < 0 ? "text-[#fe9f9f]" : "text-green-600"}`}>
                              ({row.attendanceDelta > 0 ? "+" : ""}{row.attendanceDelta.toFixed(1)})
                            </span>
                          )}
                        </span>
                      )}
                      {row.onCallsDelta !== null && (
                        <span>
                          On calls: <span className={row.onCallsDelta > 0 ? "text-[#fe9f9f]" : "text-green-600"}>{row.onCallsDelta > 0 ? "+" : ""}{row.onCallsDelta}</span>
                        </span>
                      )}
                      {row.detentionsDelta !== null && (
                        <span>
                          Detentions: <span className={row.detentionsDelta > 0 ? "text-[#fe9f9f]" : "text-green-600"}>{row.detentionsDelta > 0 ? "+" : ""}{row.detentionsDelta}</span>
                        </span>
                      )}
                    </div>
                    {row.drivers.length > 0 && <div className="mt-1.5"><DriverChips drivers={row.drivers} max={3} /></div>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

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
  const allDeptDriftingCpd = deptCpdRows.filter((r) => r.teachersDriftingDown > 0);
  const topDeptCpd = allDeptDriftingCpd.slice(0, 2);
  const topDeptTeachers = deptTeacherRows.slice(0, 5);
  const deptObsCount = deptTeacherRows.reduce((sum, r) => sum + r.teacherCoverage, 0);
  const deptCpdDrift = allDeptDriftingCpd.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label={`${deptName} observations`}
          value={deptObsCount}
          context={`${deptTeacherRows.length} teacher${deptTeacherRows.length !== 1 ? "s" : ""} · ${windowDays}d window`}
          accent="accent"
        />
        <StatCard
          label={`${deptName} CPD signals`}
          value={deptCpdDrift}
          context={deptCpdDrift > 0 ? `${deptCpdDrift} signal${deptCpdDrift !== 1 ? "s" : ""} weakening` : "All signals stable"}
          accent={deptCpdDrift > 0 ? "warning" : "success"}
        />
      </div>

      {allDepts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {allDepts.map((d) => (
            <Link
              key={d.id}
              href={`/home?dept=${d.id}&window=${windowDays}`}
              className={`rounded-full border px-3 py-1 text-xs calm-transition ${
                d.id === activeDeptId
                  ? "border-accent bg-[var(--accent-tint)] font-medium text-accent"
                  : "border-border text-muted hover:border-accent/40 hover:text-text"
              }`}
            >
              {d.name}
            </Link>
          ))}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">Dept CPD priorities</p>
            <Link href={`/analytics?tab=cpd&window=${windowDays}&department=${deptId}`} className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          {topDeptCpd.length === 0 ? (
            <MetaText>No weakening signals detected in this window.</MetaText>
          ) : (
            <ul className="space-y-1">
              {topDeptCpd.map((row) => (
                <li key={row.signalKey}>
                  <Link href={`/analysis/cpd/${row.signalKey}?window=${windowDays}&department=${deptId}`} className="block rounded-lg p-3 hover:bg-bg/60 calm-transition">
                    <p className="text-sm font-medium text-text">{row.label}</p>
                    <MetaText>{Math.round(row.driftRate * 100)}% drifting · {row.teachersCovered} covered</MetaText>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">Dept teacher priorities</p>
            <Link href={`/analytics?tab=teachers&window=${windowDays}&department=${deptId}`} className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          {topDeptTeachers.length === 0 ? (
            <MetaText>No observation data for your department in this window.</MetaText>
          ) : (
            <ul className="space-y-1">
              {topDeptTeachers.map((row) => (
                <li key={row.teacherMembershipId}>
                  <Link href={`/analysis/teachers/${row.teacherMembershipId}?window=${windowDays}`} className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-bg/60 calm-transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={row.teacherName} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{row.teacherName}</p>
                        <MetaText>{row.teacherCoverage} obs</MetaText>
                      </div>
                    </div>
                    <StatusPill variant={RISK_STATUS_PILL[row.status]}>{RISK_STATUS_LABELS[row.status]}</StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <p className="text-[14px] font-semibold text-text">Your recent observations</p>
        <Card className="space-y-3">
          {!selfProfile || selfProfile.teacherCoverage === 0 ? (
            <div className="space-y-2">
              <BodyText className="text-muted">No observations captured yet.</BodyText>
              <Link href="/observe/new" className="text-[12px] text-accent hover:underline">Start an observation →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <MetaText>
                {selfProfile.teacherCoverage} observation{selfProfile.teacherCoverage !== 1 ? "s" : ""} in last {windowDays} days
                {selfProfile.lastObservationAt && (
                  <> · Last: {new Date(selfProfile.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                )}
              </MetaText>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <MetaText className="font-medium text-text">Strengths</MetaText>
                  <div className="flex flex-wrap gap-1">
                    {selfProfile.signals
                      .filter((s) => s.currentMean !== null)
                      .sort((a, b) => (b.currentMean ?? 0) - (a.currentMean ?? 0))
                      .slice(0, 3)
                      .map((sig) => (
                        <span key={sig.signalKey} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text">{sig.label}</span>
                      ))}
                  </div>
                </div>
                {selfProfile.teacherCoverage >= 3 && (
                  <div className="space-y-1.5">
                    <MetaText className="font-medium text-text">Areas to watch</MetaText>
                    <div className="flex flex-wrap gap-1">
                      {selfProfile.signals
                        .filter((s) => s.delta !== null && s.delta < 0)
                        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
                        .slice(0, 2)
                        .map((sig) => (
                          <span key={sig.signalKey} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-[var(--warning)]">{sig.label}</span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/analysis/teachers/${userId}?window=${windowDays}`} className="text-[12px] text-accent hover:underline">View your signal profile →</Link>
                <Link href={`/observe/history?teacherId=${userId}&window=${windowDays}`} className="text-[12px] text-accent hover:underline">View observations →</Link>
              </div>
            </div>
          )}
        </Card>
      </section>

      {wholeSchoolTop1 && (
        <Card className="space-y-2">
          <p className="text-[14px] font-semibold text-text">Whole-school focus</p>
          <p className="text-sm text-text">{wholeSchoolTop1.label}</p>
          <MetaText>{Math.round(wholeSchoolTop1.driftRate * 100)}% of covered teachers · {wholeSchoolTop1.teachersCovered} covered</MetaText>
          <Link href={`/analytics?tab=cpd&window=${windowDays}`} className="text-[12px] text-accent hover:underline">See CPD priorities →</Link>
        </Card>
      )}
    </div>
  );
}

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
  openActions: MeetingActionSummary[];
  loaRequest: LoaSummary | null;
  onCallRequests: OnCallSummary[];
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

  const obsCount = selfProfile?.teacherCoverage ?? 0;
  const actionCount = openActions.length;

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
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Your observations"
          value={obsCount}
          context={obsCount > 0 ? `${windowDays}d window` : "No observations yet"}
          accent="accent"
          href={`/observe/history?teacherId=${userId}&window=${windowDays}`}
        />
        <StatCard
          label="Open actions"
          value={hasMeetingsFeature ? actionCount : "—"}
          context={hasMeetingsFeature ? (actionCount > 0 ? `${actionCount} action${actionCount !== 1 ? "s" : ""} assigned` : "All caught up") : "Meetings not enabled"}
          accent={hasMeetingsFeature && actionCount > 0 ? "warning" : "success"}
          href={hasMeetingsFeature ? "/my-actions" : undefined}
        />
      </div>

      <section className="space-y-3">
        <p className="text-[14px] font-semibold text-text">Your recent observations</p>
        <Card className="space-y-3">
          {!selfProfile || selfProfile.teacherCoverage === 0 ? (
            <div className="space-y-2">
              <BodyText className="text-muted">No observations captured yet in this window.</BodyText>
              <Link href="/observe/new" className="text-[12px] text-accent hover:underline">Start an observation →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <MetaText>
                {selfProfile.teacherCoverage} observation{selfProfile.teacherCoverage !== 1 ? "s" : ""} in last {windowDays} days
                {selfProfile.lastObservationAt && (
                  <> · Last: {new Date(selfProfile.lastObservationAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                )}
              </MetaText>
              <div className="grid gap-4 sm:grid-cols-2">
                {strengthSignals.length > 0 && (
                  <div className="space-y-1.5">
                    <MetaText className="font-medium text-text">Strengths</MetaText>
                    <div className="flex flex-wrap gap-1">
                      {strengthSignals.map((sig) => (
                        <span key={sig.signalKey} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text">{sig.label}</span>
                      ))}
                    </div>
                  </div>
                )}
                {watchSignals.length > 0 && (
                  <div className="space-y-1.5">
                    <MetaText className="font-medium text-text">Areas to watch</MetaText>
                    <div className="flex flex-wrap gap-1">
                      {watchSignals.map((sig) => (
                        <span key={sig.signalKey} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-[var(--warning)]">{sig.label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/analysis/teachers/${userId}?window=${windowDays}`} className="text-[12px] text-accent hover:underline">View your signal profile →</Link>
                <Link href={`/observe/history?teacherId=${userId}&window=${windowDays}`} className="text-[12px] text-accent hover:underline">View observations →</Link>
              </div>
            </div>
          )}
        </Card>
      </section>

      {hasMeetingsFeature && openActions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text">Your actions</p>
            <Link href="/my-actions" className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          <Card>
            <ul className="space-y-1">
              {openActions.slice(0, 5).map((action) => (
                <li key={action.id}>
                  <Link href="/my-actions" className="flex items-center justify-between gap-2 rounded-lg p-3 hover:bg-bg/60 calm-transition">
                    <span className="text-sm text-text">{action.description}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {action.dueDate && (
                        <MetaText>Due {new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</MetaText>
                      )}
                      <StatusPill variant="neutral">{action.status ?? "Open"}</StatusPill>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {(hasLeaveFeature || hasOnCallFeature) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {hasLeaveFeature && (
            <Card className="space-y-3">
              <p className="text-[14px] font-semibold text-text">Leave of absence</p>
              {loaRequest ? (
                <div className="flex items-center justify-between">
                  <BodyText className="text-sm">
                    {new Date(loaRequest.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" – "}
                    {new Date(loaRequest.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </BodyText>
                  <StatusPill variant={loaStatusPill[loaRequest.status] ?? "neutral"}>
                    {loaStatusLabel[loaRequest.status] ?? loaRequest.status}
                  </StatusPill>
                </div>
              ) : (
                <MetaText>No recent requests.</MetaText>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/leave/request" className="text-[12px] text-accent hover:underline">Request leave →</Link>
                <Link href="/leave" className="text-[12px] text-accent hover:underline">View status →</Link>
              </div>
            </Card>
          )}
          {hasOnCallFeature && (
            <Card className="space-y-3">
              <p className="text-[14px] font-semibold text-text">On call</p>
              {onCallRequests.length === 0 ? (
                <MetaText>No recent on-call requests.</MetaText>
              ) : (
                <ul className="space-y-1">
                  {onCallRequests.slice(0, 3).map((req) => (
                    <li key={req.id} className="flex items-center justify-between rounded-lg p-2">
                      <MetaText>{new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</MetaText>
                      <StatusPill variant={req.status === "OPEN" ? "neutral" : req.status === "APPROVED" ? "success" : "error"}>{req.status}</StatusPill>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/on-call/new" className="text-[12px] text-accent hover:underline">Log on-call →</Link>
                <Link href="/on-call" className="text-[12px] text-accent hover:underline">View requests →</Link>
              </div>
            </Card>
          )}
        </section>
      )}

      {wholeSchoolTop1 && (
        <Card className="space-y-2">
          <p className="text-[14px] font-semibold text-text">Whole-school focus</p>
          <p className="text-sm text-text">{wholeSchoolTop1.label}</p>
          <MetaText>School-wide signal movement this window.</MetaText>
          <Link href={`/analytics?tab=cpd&window=${windowDays}`} className="text-[12px] text-accent hover:underline">See CPD priorities →</Link>
        </Card>
      )}
    </div>
  );
}

type PrismaWithExtras = typeof prisma & {
  tenantSettings: { findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null> };
  tenantFeature: { findMany: (args: Record<string, unknown>) => Promise<{ key: string }[]> };
};
const db = prisma as PrismaWithExtras;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const user = await getSessionUserOrThrow();
  const variant = roleVariant(user.role);

  const settings = await db.tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
  });
  const rawWindow = typeof searchParams?.window === "string" ? parseInt(searchParams.window, 10) : NaN;
  const windowDays: number = ALLOWED_WINDOW_DAYS.includes(rawWindow)
    ? rawWindow
    : ((settings?.defaultInsightWindowDays as number) ?? DEFAULT_WINDOW_DAYS);

  const features = await db.tenantFeature.findMany({
    where: { tenantId: user.tenantId, enabled: true },
  });
  const enabledFeatures = new Set<string>(features.map((f) => f.key));
  const hasAnalysisFeature = enabledFeatures.has("ANALYSIS");

  const homeAssembly = assembleHomeCards({
    role: user.role,
    enabledFeatures: Array.from(enabledFeatures),
  });

  const computedAt = new Date();

  const pageContent = async () => {
    if (variant === "leadership") {
      if (!hasAnalysisFeature) {
        return (
          <Card>
            <BodyText className="text-muted">Analysis features are not yet enabled.</BodyText>
          </Card>
        );
      }
      const hasLeaveFeature = homeAssembly.has("operations.leave-approvals");
      const hasOnCallFeature = enabledFeatures.has("ON_CALL");
      const { cpdRows, teacherRows, cohortRows, studentRows, pendingLeaveCount, openOnCallCount } = await hydrateLeadershipHomeData({ user, windowDays, hasLeaveFeature, hasOnCallFeature });
      return (
        <LeadershipHome
          windowDays={windowDays}
          cpdRows={cpdRows}
          teacherRows={teacherRows}
          cohortRows={cohortRows}
          studentRows={studentRows}
          hasLeaveFeature={hasLeaveFeature}
          pendingLeaveCount={pendingLeaveCount}
          openOnCallCount={openOnCallCount}
        />
      );
    }

    if (variant === "hod") {
      const rawDept = typeof searchParams?.dept === "string" ? searchParams.dept : null;
      const { allDepts, activeDeptId, deptName, deptCpdRows, filteredTeacherRows, selfProfile, wholeSchoolTop1 } = await hydrateHodHomeData({ user, windowDays, searchDeptId: rawDept });

      if (!hasAnalysisFeature || !activeDeptId) {
        return (
          <Card>
            <BodyText className="text-muted">
              {!activeDeptId ? "No department head assignment found. Contact your administrator." : "Analysis features are not yet enabled."}
            </BodyText>
          </Card>
        );
      }

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

    const { selfProfile, wholeSchoolTop1, loaData, onCallData, openActionsData } = await hydrateTeacherHomeData({ user, windowDays, hasAnalysisFeature, assembly: homeAssembly });

    return (
      <TeacherHome
        windowDays={windowDays}
        selfProfile={selfProfile}
        openActions={openActionsData as MeetingActionSummary[]}
        loaRequest={loaData as LoaSummary | null}
        onCallRequests={onCallData as OnCallSummary[]}
        wholeSchoolTop1={wholeSchoolTop1}
        userId={user.id}
        hasMeetingsFeature={homeAssembly.has("operations.my-open-actions") || homeAssembly.has("operations.meetings-today")}
        hasLeaveFeature={homeAssembly.has("operations.my-leave-status")}
        hasOnCallFeature={homeAssembly.has("culture.my-oncall-status")}
      />
    );
  };

  const content = await pageContent();

  return (
    <div className="space-y-6">
      <PageTitle windowDays={windowDays} computedAt={computedAt} />
      {content}
    </div>
  );
}
