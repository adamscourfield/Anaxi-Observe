import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentSnapshot: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import { calculateStudentDeltas } from "@/modules/students/service";
import { StudentSnapshotRecord } from "@/modules/students/types";

const makeSnap = (overrides: Partial<StudentSnapshotRecord>): StudentSnapshotRecord => ({
  id: "snap1",
  studentId: "stu1",
  snapshotDate: new Date("2026-01-01"),
  positivePointsTotal: 10,
  detentionsCount: 1,
  internalExclusionsCount: 0,
  suspensionsCount: 0,
  onCallsCount: 0,
  attendancePct: 95,
  latenessCount: 1,
  ...overrides,
});

describe("calculateStudentDeltas", () => {
  it("returns null deltas with no previous snapshot", () => {
    const current = makeSnap({});
    const result = calculateStudentDeltas(current, null);
    expect(result.attendanceDelta).toBeNull();
    expect(result.detentionsDelta).toBeNull();
    expect(result.behaviourSpikeFlag).toBe(false);
    expect(result.attendanceDropFlag).toBe(false);
  });

  it("detects attendance drop", () => {
    const current = makeSnap({ attendancePct: 88 });
    const previous = makeSnap({ attendancePct: 95 });
    const result = calculateStudentDeltas(current, previous);
    expect(result.attendanceDelta?.delta).toBeLessThan(-2);
    expect(result.attendanceDropFlag).toBe(true);
  });

  it("detects behaviour spike on detentions", () => {
    const current = makeSnap({ detentionsCount: 8 });
    const previous = makeSnap({ detentionsCount: 1 });
    const result = calculateStudentDeltas(current, previous);
    expect(result.behaviourSpikeFlag).toBe(true);
  });

  it("calculates percent change correctly", () => {
    const current = makeSnap({ detentionsCount: 4 });
    const previous = makeSnap({ detentionsCount: 2 });
    const result = calculateStudentDeltas(current, previous);
    expect(result.detentionsDelta?.delta).toBe(2);
    expect(result.detentionsDelta?.percentChange).toBeCloseTo(100);
  });

  it("handles zero previous (no percent change)", () => {
    const current = makeSnap({ detentionsCount: 3 });
    const previous = makeSnap({ detentionsCount: 0 });
    const result = calculateStudentDeltas(current, previous);
    expect(result.detentionsDelta?.percentChange).toBeNull();
  });

  it("multi-tenant isolation: each student gets independent deltas", () => {
    const s1current = makeSnap({ studentId: "s1", attendancePct: 80 });
    const s1previous = makeSnap({ studentId: "s1", attendancePct: 95 });
    const s2current = makeSnap({ studentId: "s2", attendancePct: 95 });
    const s2previous = makeSnap({ studentId: "s2", attendancePct: 95 });

    const r1 = calculateStudentDeltas(s1current, s1previous);
    const r2 = calculateStudentDeltas(s2current, s2previous);

    expect(r1.attendanceDropFlag).toBe(true);
    expect(r2.attendanceDropFlag).toBe(false);
  });
});
