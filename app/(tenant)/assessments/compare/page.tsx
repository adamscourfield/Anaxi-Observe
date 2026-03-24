"use client";

/**
 * Dataset Comparison Page
 *
 * Lets users pick two assessments (A and B) and view side-by-side stats:
 *   - Student count, present/absent/withdrawn
 *   - Mean grade (displayed in original format)
 *   - Grade distribution (4-bucket bar)
 *   - % in each attainment band
 *   - Delta summary if formats are the same
 */

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import type { GradeFormat } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Cycle = {
  id: string;
  label: string;
  points: Array<{ id: string; label: string; ordinal: number }>;
};

type AssessmentMeta = {
  id: string;
  title: string;
  subject: string;
  yearGroup: string;
  gradeFormat: GradeFormat;
  maxScore: number | null;
};

type ResultRow = {
  studentId: string;
  student: { fullName: string; yearGroup: string | null };
  normalizedScore: number | null;
  rawValue: string;
  status: string;
};

type DatasetStats = {
  assessment: AssessmentMeta;
  total: number;
  present: number;
  absent: number;
  withdrawn: number;
  mean: number | null;
  meanDisplay: string;
  buckets: [number, number, number, number]; // high, mid-high, mid-low, low counts
  results: ResultRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_FORMAT_LABELS: Record<GradeFormat, string> = {
  GCSE: "GCSE 1–9",
  A_LEVEL: "A Level",
  PERCENTAGE: "Percentage",
  RAW: "Raw score",
};

const BUCKET_LABELS = ["High (75%+)", "Mid-high (50–74%)", "Mid-low (25–49%)", "Low (<25%)"];

const BUCKET_COLOURS = [
  "bg-[var(--success)]",
  "bg-[var(--accent)]/60",
  "bg-[var(--warning)]/60",
  "bg-[var(--error)]/60",
];

const BUCKET_TEXT = [
  "text-[var(--success)]",
  "text-[var(--accent)]",
  "text-[var(--warning)]",
  "text-[var(--error)]",
];

function computeStats(
  assessment: AssessmentMeta,
  results: ResultRow[],
  meta: { present: number; absent: number; withdrawn: number }
): DatasetStats {
  const presentResults = results.filter((r) => r.status === "PRESENT");
  const scores = presentResults
    .map((r) => r.normalizedScore)
    .filter((s): s is number => s !== null);

  const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const buckets: [number, number, number, number] = [
    scores.filter((s) => s >= 0.75).length,
    scores.filter((s) => s >= 0.5 && s < 0.75).length,
    scores.filter((s) => s >= 0.25 && s < 0.5).length,
    scores.filter((s) => s < 0.25).length,
  ];

  let meanDisplay = "—";
  if (mean !== null) {
    switch (assessment.gradeFormat) {
      case "GCSE":
        meanDisplay = String(Math.max(1, Math.min(9, Math.round(mean * 9))));
        break;
      case "A_LEVEL": {
        const entries = [
          ["A*", 1.0], ["A", 6 / 7], ["B", 5 / 7], ["C", 4 / 7],
          ["D", 3 / 7], ["E", 2 / 7], ["U", 0],
        ] as [string, number][];
        for (const [label, score] of entries) {
          if (mean >= score - 0.001) { meanDisplay = label; break; }
        }
        break;
      }
      case "PERCENTAGE":
        meanDisplay = `${Math.round(mean * 100)}%`;
        break;
      case "RAW":
        meanDisplay = assessment.maxScore
          ? String(Math.round(mean * assessment.maxScore))
          : `${Math.round(mean * 100)}%`;
        break;
    }
  }

  return {
    assessment,
    total: results.length,
    present: meta.present,
    absent: meta.absent,
    withdrawn: meta.withdrawn,
    mean,
    meanDisplay,
    buckets,
    results,
  };
}

// ─── Assessment selector sub-component ───────────────────────────────────────

function AssessmentSelector({
  label,
  cycles,
  onSelect,
}: {
  label: string;
  cycles: Cycle[];
  onSelect: (assessmentId: string, meta: AssessmentMeta) => void;
}) {
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? "");
  const [pointId, setPointId] = useState("");
  const [assessments, setAssessments] = useState<AssessmentMeta[]>([]);
  const [assessmentId, setAssessmentId] = useState("");

  const selectedCycle = cycles.find((c) => c.id === cycleId);

  useEffect(() => {
    if (cycles[0]) {
      setCycleId(cycles[0].id);
      if (cycles[0].points[0]) setPointId(cycles[0].points[0].id);
    }
  }, [cycles]);

  useEffect(() => {
    if (!pointId) return;
    fetch(`/api/assessments?pointId=${pointId}`)
      .then((r) => r.json())
      .then((d) => {
        setAssessments(d.assessments ?? []);
        if (d.assessments?.[0]) setAssessmentId(d.assessments[0].id);
      });
  }, [pointId]);

  useEffect(() => {
    const meta = assessments.find((a) => a.id === assessmentId);
    if (meta) onSelect(assessmentId, meta);
  }, [assessmentId, assessments, onSelect]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-muted)]">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[var(--on-surface-muted)]">Cycle</label>
          <select
            className="field w-full"
            value={cycleId}
            onChange={(e) => {
              setCycleId(e.target.value);
              const c = cycles.find((x) => x.id === e.target.value);
              if (c?.points[0]) setPointId(c.points[0].id);
            }}
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--on-surface-muted)]">Assessment point</label>
          <select
            className="field w-full"
            value={pointId}
            onChange={(e) => setPointId(e.target.value)}
          >
            {selectedCycle?.points.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[var(--on-surface-muted)]">Assessment</label>
        <select
          className="field w-full"
          value={assessmentId}
          onChange={(e) => setAssessmentId(e.target.value)}
        >
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} — {a.yearGroup}
            </option>
          ))}
          {assessments.length === 0 && (
            <option disabled value="">No assessments for this point</option>
          )}
        </select>
      </div>
    </div>
  );
}

// ─── Stats panel ──────────────────────────────────────────────────────────────

function StatsPanel({ stats, side }: { stats: DatasetStats; side: "A" | "B" }) {
  const total = stats.present;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--on-surface)]">{stats.assessment.title}</p>
        <p className="text-xs text-[var(--on-surface-muted)]">
          {stats.assessment.subject} · {stats.assessment.yearGroup} ·{" "}
          {GRADE_FORMAT_LABELS[stats.assessment.gradeFormat]}
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--surface-container)] p-3">
          <p className="text-xs text-[var(--on-surface-muted)]">Mean grade</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{stats.meanDisplay}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-container)] p-3">
          <p className="text-xs text-[var(--on-surface-muted)]">Students</p>
          <p className="text-2xl font-bold text-[var(--on-surface)]">{stats.total}</p>
          <p className="text-xs text-[var(--on-surface-muted)]">
            {stats.present} present · {stats.absent} absent
          </p>
        </div>
      </div>

      {/* Distribution bar */}
      {total > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--on-surface-muted)]">Grade distribution</p>
          <div className="flex h-8 gap-0.5 overflow-hidden rounded-lg">
            {stats.buckets.map((count, i) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={i}
                  title={`${BUCKET_LABELS[i]}: ${count} (${Math.round(pct)}%)`}
                  className={`${BUCKET_COLOURS[i]} flex items-center justify-center text-xs font-medium text-white`}
                  style={{ width: `${pct}%` }}
                >
                  {pct > 8 && `${Math.round(pct)}%`}
                </div>
              );
            })}
          </div>
          <div className="space-y-1">
            {stats.buckets.map((count, i) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--on-surface-muted)]">
                    <span className={`inline-block h-2 w-2 rounded-sm ${BUCKET_COLOURS[i]}`} />
                    {BUCKET_LABELS[i]}
                  </span>
                  <span className={`font-semibold tabular-nums ${BUCKET_TEXT[i]}`}>
                    {count} <span className="font-normal text-[var(--on-surface-muted)]">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectionA, setSelectionA] = useState<{ id: string; meta: AssessmentMeta } | null>(null);
  const [selectionB, setSelectionB] = useState<{ id: string; meta: AssessmentMeta } | null>(null);
  const [statsA, setStatsA] = useState<DatasetStats | null>(null);
  const [statsB, setStatsB] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assessments/cycles")
      .then((r) => r.json())
      .then((d) => setCycles(d.cycles ?? []));
  }, []);

  const handleSelectA = useCallback((id: string, meta: AssessmentMeta) => {
    setSelectionA({ id, meta });
    setStatsA(null);
  }, []);

  const handleSelectB = useCallback((id: string, meta: AssessmentMeta) => {
    setSelectionB({ id, meta });
    setStatsB(null);
  }, []);

  async function fetchResults(id: string, meta: AssessmentMeta): Promise<DatasetStats | null> {
    const res = await fetch(`/api/assessments/${id}/results`);
    if (!res.ok) return null;
    const d = await res.json();
    return computeStats(meta, d.results, d.meta);
  }

  async function handleCompare() {
    if (!selectionA || !selectionB) return;
    if (selectionA.id === selectionB.id) {
      setError("Please select two different assessments to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetchResults(selectionA.id, selectionA.meta),
        fetchResults(selectionB.id, selectionB.meta),
      ]);
      setStatsA(a);
      setStatsB(b);
    } catch {
      setError("Failed to load assessment data.");
    } finally {
      setLoading(false);
    }
  }

  // Compute deltas between A and B (only if both loaded)
  const canShowDelta = statsA && statsB && statsA.present > 0 && statsB.present > 0;
  const meanDelta =
    canShowDelta && statsA.mean !== null && statsB.mean !== null
      ? statsB.mean - statsA.mean
      : null;

  const bucketDiffs =
    canShowDelta
      ? statsA.buckets.map((countA, i) => {
          const pctA = statsA.present > 0 ? (countA / statsA.present) * 100 : 0;
          const pctB = statsB.present > 0 ? (statsB.buckets[i] / statsB.present) * 100 : 0;
          return Math.round((pctB - pctA) * 10) / 10;
        })
      : null;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Compare Datasets"
          subtitle="Select two assessments to view side-by-side attainment stats."
        />
        <a href="/assessments" className="text-sm text-[var(--on-surface-muted)] hover:underline">
          ← Assessments
        </a>
      </div>

      {/* Selector card */}
      <Card className="space-y-6">
        <SectionHeader title="Choose assessments" subtitle="Pick any two assessments — they can be from different cycles, subjects, or year groups." />
        {cycles.length === 0 ? (
          <p className="text-sm text-[var(--on-surface-muted)]">Loading cycles…</p>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                  A
                </span>
                <AssessmentSelector label="Dataset A" cycles={cycles} onSelect={handleSelectA} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--on-surface-muted)] text-xs font-bold text-white">
                  B
                </span>
                <AssessmentSelector label="Dataset B" cycles={cycles} onSelect={handleSelectB} />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[var(--error)]">{error}</p>}

        <Button
          onClick={handleCompare}
          disabled={loading || !selectionA || !selectionB}
        >
          {loading ? "Loading…" : "Compare"}
        </Button>
      </Card>

      {/* Results */}
      {statsA && statsB && (
        <>
          {/* Side-by-side stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                  A
                </span>
              </div>
              <StatsPanel stats={statsA} side="A" />
            </Card>
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--on-surface-muted)] text-xs font-bold text-white">
                  B
                </span>
              </div>
              <StatsPanel stats={statsB} side="B" />
            </Card>
          </div>

          {/* Delta summary */}
          {canShowDelta && (
            <Card className="space-y-4">
              <SectionHeader
                title="Comparison summary"
                subtitle="B minus A — positive values favour Dataset B"
              />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {/* Mean delta */}
                <div className="space-y-1">
                  <p className="text-xs text-[var(--on-surface-muted)]">Mean score shift</p>
                  {meanDelta !== null ? (
                    <p
                      className={`text-2xl font-bold tabular-nums ${
                        meanDelta > 0.02
                          ? "text-[var(--success)]"
                          : meanDelta < -0.02
                          ? "text-[var(--error)]"
                          : "text-[var(--on-surface-muted)]"
                      }`}
                    >
                      {meanDelta > 0 ? "+" : ""}
                      {Math.round(meanDelta * 100)}pp
                    </p>
                  ) : (
                    <p className="text-xl text-[var(--on-surface-muted)]">—</p>
                  )}
                  <p className="text-xs text-[var(--on-surface-muted)]">normalised percentage points</p>
                </div>

                {/* Student count diff */}
                <div className="space-y-1">
                  <p className="text-xs text-[var(--on-surface-muted)]">Student count diff</p>
                  <p className="text-2xl font-bold tabular-nums text-[var(--on-surface)]">
                    {statsB.total > statsA.total ? "+" : ""}
                    {statsB.total - statsA.total}
                  </p>
                  <p className="text-xs text-[var(--on-surface-muted)]">
                    {statsA.total} vs {statsB.total}
                  </p>
                </div>

                {/* High attainment diff */}
                {bucketDiffs && (
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--on-surface-muted)]">High attainment diff</p>
                    <p
                      className={`text-2xl font-bold tabular-nums ${
                        bucketDiffs[0] > 2
                          ? "text-[var(--success)]"
                          : bucketDiffs[0] < -2
                          ? "text-[var(--error)]"
                          : "text-[var(--on-surface-muted)]"
                      }`}
                    >
                      {bucketDiffs[0] > 0 ? "+" : ""}
                      {bucketDiffs[0]}pp
                    </p>
                    <p className="text-xs text-[var(--on-surface-muted)]">% in top band (75%+)</p>
                  </div>
                )}

                {/* Low attainment diff */}
                {bucketDiffs && (
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--on-surface-muted)]">Low attainment diff</p>
                    <p
                      className={`text-2xl font-bold tabular-nums ${
                        bucketDiffs[3] < -2
                          ? "text-[var(--success)]"
                          : bucketDiffs[3] > 2
                          ? "text-[var(--error)]"
                          : "text-[var(--on-surface-muted)]"
                      }`}
                    >
                      {bucketDiffs[3] > 0 ? "+" : ""}
                      {bucketDiffs[3]}pp
                    </p>
                    <p className="text-xs text-[var(--on-surface-muted)]">% in bottom band (&lt;25%)</p>
                  </div>
                )}
              </div>

              {/* Bucket-by-bucket comparison bars */}
              {bucketDiffs && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--on-surface-muted)]">
                    Band-by-band breakdown
                  </p>
                  {BUCKET_LABELS.map((label, i) => {
                    const pctA =
                      statsA.present > 0
                        ? Math.round((statsA.buckets[i] / statsA.present) * 100)
                        : 0;
                    const pctB =
                      statsB.present > 0
                        ? Math.round((statsB.buckets[i] / statsB.present) * 100)
                        : 0;
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-[var(--on-surface-muted)]">
                            <span className={`inline-block h-2 w-2 rounded-sm ${BUCKET_COLOURS[i]}`} />
                            {label}
                          </span>
                          <span className="text-[var(--on-surface-muted)]">
                            A: <span className="font-semibold text-[var(--accent)]">{pctA}%</span>
                            {"  "}B:{" "}
                            <span className="font-semibold text-[var(--on-surface)]">{pctB}%</span>
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-container)]">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]/70"
                              style={{ width: `${pctA}%` }}
                            />
                          </div>
                          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-container)]">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-[var(--on-surface-muted)]/60"
                              style={{ width: `${pctB}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Student-level comparison table (only when same subject/yearGroup) */}
          {statsA.assessment.subject === statsB.assessment.subject &&
            statsA.assessment.yearGroup === statsB.assessment.yearGroup && (
              <Card className="space-y-4">
                <SectionHeader
                  title="Student-level comparison"
                  subtitle={`${statsA.assessment.subject} · ${statsA.assessment.yearGroup} — scores in A vs B`}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--outline-variant)]/30 text-left text-xs font-medium uppercase tracking-wide text-[var(--on-surface-muted)]">
                        <th className="pb-2 pr-4">Student</th>
                        <th className="pb-2 pr-4 text-center">
                          <span className="flex items-center justify-center gap-1">
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white">A</span>
                          </span>
                        </th>
                        <th className="pb-2 pr-4 text-center">
                          <span className="flex items-center justify-center gap-1">
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--on-surface-muted)] text-[9px] font-bold text-white">B</span>
                          </span>
                        </th>
                        <th className="pb-2 text-center">Δ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--outline-variant)]/20">
                      {(() => {
                        const mapA = new Map(
                          statsA.results.map((r) => [r.studentId, r])
                        );
                        const mapB = new Map(
                          statsB.results.map((r) => [r.studentId, r])
                        );
                        const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
                        const rows = [...allIds].map((sid) => ({
                          studentId: sid,
                          name:
                            mapA.get(sid)?.student.fullName ??
                            mapB.get(sid)?.student.fullName ??
                            sid,
                          scoreA: mapA.get(sid)?.normalizedScore ?? null,
                          scoreB: mapB.get(sid)?.normalizedScore ?? null,
                          rawA: mapA.get(sid)?.rawValue ?? "—",
                          rawB: mapB.get(sid)?.rawValue ?? "—",
                          statusA: mapA.get(sid)?.status ?? "—",
                          statusB: mapB.get(sid)?.status ?? "—",
                        }));
                        rows.sort((a, b) => (b.scoreB ?? -1) - (a.scoreB ?? -1));

                        return rows.map((row) => {
                          const delta =
                            row.scoreA !== null && row.scoreB !== null
                              ? row.scoreB - row.scoreA
                              : null;
                          const deltaLabel =
                            delta === null
                              ? "—"
                              : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "="} ${Math.abs(Math.round(delta * 100))}pp`;
                          const deltaClass =
                            delta === null
                              ? "text-[var(--on-surface-muted)]"
                              : delta > 0.05
                              ? "text-[var(--success)] font-semibold"
                              : delta < -0.05
                              ? "text-[var(--error)] font-semibold"
                              : "text-[var(--on-surface-muted)]";

                          return (
                            <tr key={row.studentId}>
                              <td className="py-2 pr-4 font-medium text-[var(--on-surface)]">
                                {row.name}
                              </td>
                              <td className="py-2 pr-4 text-center tabular-nums text-[var(--accent)]">
                                {row.statusA === "PRESENT" ? row.rawA : (
                                  <span className="text-xs text-[var(--on-surface-muted)]">{row.statusA}</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-center tabular-nums text-[var(--on-surface)]">
                                {row.statusB === "PRESENT" ? row.rawB : (
                                  <span className="text-xs text-[var(--on-surface-muted)]">{row.statusB}</span>
                                )}
                              </td>
                              <td className={`py-2 text-center tabular-nums text-xs ${deltaClass}`}>
                                {deltaLabel}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
        </>
      )}
    </div>
  );
}
