import { describe, it, expect } from "vitest";
import {
  getTopImprovingSignals,
  type CpdPriorityRow,
} from "@/modules/analysis/cpdPriorities";
import { canViewCpdDrilldown, type ViewerContext } from "@/modules/authz/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<CpdPriorityRow>): CpdPriorityRow {
  return {
    signalKey: "SIGNAL_A",
    label: "Signal A",
    teachersCovered: 10,
    teachersDriftingDown: 2,
    driftRate: 0.2,
    avgNegativeDelta: -0.5,
    avgNegDeltaAbs: 0.5,
    priorityScore: 0.1,
    teachersImproving: 3,
    improvingRate: 0.3,
    avgPositiveDelta: 0.6,
    priorityImprovementScore: 0.18,
    ...overrides,
  };
}

// ─── getTopImprovingSignals ───────────────────────────────────────────────────

describe("getTopImprovingSignals", () => {
  it("returns top 2 by priorityImprovementScore", () => {
    const rows: CpdPriorityRow[] = [
      makeRow({ signalKey: "A", priorityImprovementScore: 0.1, teachersImproving: 2, teachersCovered: 10 }),
      makeRow({ signalKey: "B", priorityImprovementScore: 0.3, teachersImproving: 3, teachersCovered: 10 }),
      makeRow({ signalKey: "C", priorityImprovementScore: 0.5, teachersImproving: 4, teachersCovered: 10 }),
      makeRow({ signalKey: "D", priorityImprovementScore: 0.2, teachersImproving: 1, teachersCovered: 10 }),
    ];
    const top = getTopImprovingSignals(rows);
    expect(top).toHaveLength(2);
    expect(top[0].signalKey).toBe("C");
    expect(top[1].signalKey).toBe("B");
  });

  it("excludes signals with zero teachersImproving", () => {
    const rows: CpdPriorityRow[] = [
      makeRow({ signalKey: "A", teachersImproving: 0, priorityImprovementScore: 0.5, teachersCovered: 10 }),
      makeRow({ signalKey: "B", teachersImproving: 2, priorityImprovementScore: 0.3, teachersCovered: 10 }),
    ];
    const top = getTopImprovingSignals(rows);
    expect(top).toHaveLength(1);
    expect(top[0].signalKey).toBe("B");
  });

  it("excludes signals below minimum coverage threshold (5)", () => {
    const rows: CpdPriorityRow[] = [
      makeRow({ signalKey: "A", teachersCovered: 4, teachersImproving: 2, priorityImprovementScore: 0.5 }),
      makeRow({ signalKey: "B", teachersCovered: 5, teachersImproving: 2, priorityImprovementScore: 0.3 }),
    ];
    const top = getTopImprovingSignals(rows);
    expect(top).toHaveLength(1);
    expect(top[0].signalKey).toBe("B");
  });

  it("returns empty array when no eligible signals", () => {
    const rows: CpdPriorityRow[] = [
      makeRow({ teachersCovered: 3, teachersImproving: 0 }),
    ];
    expect(getTopImprovingSignals(rows)).toHaveLength(0);
  });

  it("returns at most 2 signals even when more are eligible", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({
        signalKey: `SIG_${i}`,
        teachersCovered: 10,
        teachersImproving: i + 1,
        priorityImprovementScore: i * 0.1,
      })
    );
    expect(getTopImprovingSignals(rows)).toHaveLength(2);
  });
});

// ─── canViewCpdDrilldown ──────────────────────────────────────────────────────

describe("canViewCpdDrilldown", () => {
  it("ADMIN can view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "ADMIN", hodDepartmentIds: [], coacheeUserIds: [] };
    expect(canViewCpdDrilldown(viewer)).toBe(true);
  });

  it("SLT can view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "SLT", hodDepartmentIds: [], coacheeUserIds: [] };
    expect(canViewCpdDrilldown(viewer)).toBe(true);
  });

  it("HOD can view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "HOD", hodDepartmentIds: ["dept-1"], coacheeUserIds: [] };
    expect(canViewCpdDrilldown(viewer)).toBe(true);
  });

  it("LEADER with coachees can view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "LEADER", hodDepartmentIds: [], coacheeUserIds: ["t1"] };
    expect(canViewCpdDrilldown(viewer)).toBe(true);
  });

  it("LEADER without coachees cannot view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "LEADER", hodDepartmentIds: [], coacheeUserIds: [] };
    expect(canViewCpdDrilldown(viewer)).toBe(false);
  });

  it("TEACHER cannot view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "TEACHER", hodDepartmentIds: [], coacheeUserIds: [] };
    expect(canViewCpdDrilldown(viewer)).toBe(false);
  });

  it("HR cannot view drilldown", () => {
    const viewer: ViewerContext = { userId: "a", role: "HR", hodDepartmentIds: [], coacheeUserIds: [] };
    expect(canViewCpdDrilldown(viewer)).toBe(false);
  });
});
