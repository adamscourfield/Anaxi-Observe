import { describe, it, expect } from "vitest";
import {
  computeRiskScore,
  scoreToBand,
  type SRIDeltas,
  type RiskBand,
} from "@/modules/analysis/studentRisk";

// ─── scoreToBand ──────────────────────────────────────────────────────────────

describe("scoreToBand", () => {
  const cases: [number, RiskBand][] = [
    [0, "STABLE"],
    [1, "STABLE"],
    [2, "STABLE"],
    [3, "WATCH"],
    [5, "WATCH"],
    [6, "PRIORITY"],
    [8, "PRIORITY"],
    [9, "URGENT"],
    [15, "URGENT"],
  ];

  it.each(cases)("score %i → %s", (score, expected) => {
    expect(scoreToBand(score)).toBe(expected);
  });
});

// ─── computeRiskScore ─────────────────────────────────────────────────────────

describe("computeRiskScore", () => {
  it("all nulls → 0", () => {
    const deltas: SRIDeltas = {
      attendanceDelta: null,
      onCallsDelta: null,
      detentionsDelta: null,
      latenessDelta: null,
      suspensionsDelta: null,
      internalExclusionsDelta: null,
    };
    expect(computeRiskScore(deltas)).toBe(0);
  });

  it("all zeros → 0", () => {
    const deltas: SRIDeltas = {
      attendanceDelta: 0,
      onCallsDelta: 0,
      detentionsDelta: 0,
      latenessDelta: 0,
      suspensionsDelta: 0,
      internalExclusionsDelta: 0,
    };
    expect(computeRiskScore(deltas)).toBe(0);
  });

  // ── Attendance severity ────────────────────────────────────────────────────

  it("attendance delta = -0.5 → severity 0", () => {
    expect(computeRiskScore({ attendanceDelta: -0.5, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(0);
  });

  it("attendance delta = -2 → severity 1", () => {
    expect(computeRiskScore({ attendanceDelta: -2, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(1);
  });

  it("attendance delta = -4 → severity 2", () => {
    expect(computeRiskScore({ attendanceDelta: -4, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(2);
  });

  it("attendance delta = -7 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: -7, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(3);
  });

  // ── On-call severity ───────────────────────────────────────────────────────

  it("onCalls delta = 0 → severity 0", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: 0, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(0);
  });

  it("onCalls delta = 1 → severity 2", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: 1, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(2);
  });

  it("onCalls delta = 3 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: 3, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(3);
  });

  // ── Detentions severity ────────────────────────────────────────────────────

  it("detentions delta = 1 → severity 1", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: 1, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(1);
  });

  it("detentions delta = 4 → severity 2", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: 4, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(2);
  });

  it("detentions delta = 6 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: 6, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(3);
  });

  // ── Suspensions severity ───────────────────────────────────────────────────

  it("suspensions delta = 0 → severity 0", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: 0, internalExclusionsDelta: null })).toBe(0);
  });

  it("suspensions delta = 1 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: 1, internalExclusionsDelta: null })).toBe(3);
  });

  it("suspensions delta = 2 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: 2, internalExclusionsDelta: null })).toBe(3);
  });

  // ── Internal exclusion severity ────────────────────────────────────────────

  it("internal exclusions delta = 1 → severity 2", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: 1 })).toBe(2);
  });

  it("internal exclusions delta = 2 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: null, suspensionsDelta: null, internalExclusionsDelta: 2 })).toBe(3);
  });

  // ── Lateness severity ──────────────────────────────────────────────────────

  it("lateness delta = 2 → severity 1", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: 2, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(1);
  });

  it("lateness delta = 4 → severity 2", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: 4, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(2);
  });

  it("lateness delta = 6 → severity 3", () => {
    expect(computeRiskScore({ attendanceDelta: null, onCallsDelta: null, detentionsDelta: null, latenessDelta: 6, suspensionsDelta: null, internalExclusionsDelta: null })).toBe(3);
  });

  // ── Combined scenarios ─────────────────────────────────────────────────────

  it("URGENT scenario: attendance -8 (3) + onCalls +3 (3) + detentions +6 (3) = 9", () => {
    const deltas: SRIDeltas = {
      attendanceDelta: -8,
      onCallsDelta: 3,
      detentionsDelta: 6,
      latenessDelta: 0,
      suspensionsDelta: 0,
      internalExclusionsDelta: 0,
    };
    expect(computeRiskScore(deltas)).toBe(9);
    expect(scoreToBand(9)).toBe("URGENT");
  });

  it("PRIORITY scenario: detentions +4 (2) + lateness +4 (2) + attendance -2 (1) = 5... wait, -2 >= -3 so severity 1. That gives 5 → WATCH", () => {
    // attendance -2: between -3 and -1 → severity 1
    // detentions +4: between 3-5 → severity 2
    // lateness +4: between 3-5 → severity 2
    // total = 5 → WATCH
    const deltas: SRIDeltas = {
      attendanceDelta: -2,
      onCallsDelta: 0,
      detentionsDelta: 4,
      latenessDelta: 4,
      suspensionsDelta: 0,
      internalExclusionsDelta: 0,
    };
    expect(computeRiskScore(deltas)).toBe(5);
    expect(scoreToBand(5)).toBe("WATCH");
  });

  it("STABLE scenario: all very small or positive", () => {
    const deltas: SRIDeltas = {
      attendanceDelta: 1,
      onCallsDelta: 0,
      detentionsDelta: 0,
      latenessDelta: 0,
      suspensionsDelta: 0,
      internalExclusionsDelta: 0,
    };
    expect(computeRiskScore(deltas)).toBe(0);
    expect(scoreToBand(0)).toBe("STABLE");
  });
});
