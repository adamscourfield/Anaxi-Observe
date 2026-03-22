"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import type { GradeFormat } from "@prisma/client";
import type { MetricRule, ThresholdMetricResult, CombinedMetricResult } from "@/modules/assessments/metrics";

const GRADE_FORMAT_LABELS: Record<GradeFormat, string> = {
  GCSE: "GCSE (1–9)",
  A_LEVEL: "A Level (A*–U)",
  PERCENTAGE: "Percentage",
  RAW: "Raw score",
};

const THRESHOLD_EXAMPLES: Record<GradeFormat, string> = {
  GCSE: "e.g. 4",
  A_LEVEL: "e.g. C",
  PERCENTAGE: "e.g. 70",
  RAW: "e.g. 60",
};

type Cycle = {
  id: string;
  label: string;
  points: Array<{ id: string; label: string; ordinal: number }>;
};

type Assessment = {
  id: string;
  subject: string;
  yearGroup: string;
  gradeFormat: GradeFormat;
  maxScore: number | null;
};

type Preset = {
  id: string;
  name: string;
  description: string | null;
  rulesJson: MetricRule[];
  logic: string;
};

type MetricMode = "threshold" | "combined";

export default function MetricsPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [selectedPointId, setSelectedPointId] = useState("");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);

  const [mode, setMode] = useState<MetricMode>("threshold");

  // Threshold mode
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [threshold, setThreshold] = useState("");
  const [operator, setOperator] = useState<"gte" | "gt">("gte");
  const [thresholdResult, setThresholdResult] = useState<ThresholdMetricResult | null>(null);

  // Combined mode
  const [rules, setRules] = useState<MetricRule[]>([
    { subject: "", threshold: "", gradeFormat: "GCSE", operator: "gte" },
  ]);
  const [combinedLogic, setCombinedLogic] = useState<"AND" | "OR">("AND");
  const [combinedResult, setCombinedResult] = useState<CombinedMetricResult | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetSaved, setPresetSaved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);
  const selectedPoint = selectedCycle?.points.find((p) => p.id === selectedPointId);
  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  useEffect(() => {
    fetch("/api/assessments/cycles")
      .then((r) => r.json())
      .then((d) => {
        setCycles(d.cycles ?? []);
        if (d.cycles?.[0]) {
          setSelectedCycleId(d.cycles[0].id);
          if (d.cycles[0].points?.[0]) setSelectedPointId(d.cycles[0].points[0].id);
        }
      });
    fetch("/api/assessments/metric-presets")
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []));
  }, []);

  useEffect(() => {
    if (!selectedPointId) return;
    fetch(`/api/assessments?pointId=${selectedPointId}`)
      .then((r) => r.json())
      .then((d) => {
        setAssessments(d.assessments ?? []);
        if (d.assessments?.[0]) setSelectedAssessmentId(d.assessments[0].id);
      });
  }, [selectedPointId]);

  async function runThresholdMetric() {
    if (!selectedAssessmentId || !threshold) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/assessments/metrics?type=threshold&assessmentId=${selectedAssessmentId}&threshold=${encodeURIComponent(threshold)}&operator=${operator}`
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
      const d = await res.json();
      setThresholdResult(d.metric);
    } finally {
      setLoading(false);
    }
  }

  async function runCombinedMetric() {
    if (!selectedPointId) return;
    const filledRules = rules.filter((r) => r.subject && r.threshold);
    if (filledRules.length === 0) {
      setError("Add at least one complete rule.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/assessments/metrics?type=combined&pointId=${selectedPointId}&logic=${combinedLogic}&rulesJson=${encodeURIComponent(JSON.stringify(filledRules))}`
      );
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
      const d = await res.json();
      setCombinedResult(d.metric);
    } finally {
      setLoading(false);
    }
  }

  async function savePreset() {
    if (!presetName) return;
    const filledRules = rules.filter((r) => r.subject && r.threshold);
    const res = await fetch("/api/assessments/metric-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: presetName, rules: filledRules, logic: combinedLogic }),
    });
    if (res.ok) {
      const d = await res.json();
      setPresets((p) => [d.preset, ...p]);
      setPresetSaved(true);
      setTimeout(() => setPresetSaved(false), 3000);
    }
  }

  function addRule() {
    setRules((r) => [...r, { subject: "", threshold: "", gradeFormat: "GCSE", operator: "gte" }]);
  }

  function updateRule(i: number, field: keyof MetricRule, value: string) {
    setRules((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  function loadPreset(preset: Preset) {
    setRules(preset.rulesJson);
    setCombinedLogic(preset.logic as "AND" | "OR");
    setMode("combined");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Metric builder"
        subtitle="Compute attainment thresholds and combined metrics for your cohort."
      />

      {/* Cycle / point selector */}
      <Card className="space-y-3">
        <SectionHeader title="Assessment point" />
        <div className="flex gap-4">
          <select
            className="field"
            value={selectedCycleId}
            onChange={(e) => {
              setSelectedCycleId(e.target.value);
              const cycle = cycles.find((c) => c.id === e.target.value);
              if (cycle?.points[0]) setSelectedPointId(cycle.points[0].id);
            }}
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            className="field"
            value={selectedPointId}
            onChange={(e) => setSelectedPointId(e.target.value)}
          >
            {selectedCycle?.points.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("threshold")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "threshold"
              ? "bg-accent text-white"
              : "border border-border text-text hover:bg-surface"
          }`}
        >
          Single threshold
        </button>
        <button
          onClick={() => setMode("combined")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "combined"
              ? "bg-accent text-white"
              : "border border-border text-text hover:bg-surface"
          }`}
        >
          Combined metric
        </button>
      </div>

      {/* Threshold mode */}
      {mode === "threshold" && (
        <Card className="space-y-4">
          <SectionHeader
            title="Single threshold"
            subtitle="What % of students achieved at or above a grade in a specific assessment?"
          />
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">Assessment</label>
              <select
                className="field w-full"
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.subject} — {a.yearGroup}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">Threshold</label>
              <input
                className="field w-full"
                placeholder={selectedAssessment ? THRESHOLD_EXAMPLES[selectedAssessment.gradeFormat] : "e.g. 4"}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">Operator</label>
              <select
                className="field w-full"
                value={operator}
                onChange={(e) => setOperator(e.target.value as "gte" | "gt")}
              >
                <option value="gte">At or above (≥)</option>
                <option value="gt">Above (&gt;)</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button onClick={runThresholdMetric} disabled={loading || !selectedAssessmentId || !threshold}>
            {loading ? "Computing…" : "Compute"}
          </Button>

          {thresholdResult && (
            <div className="mt-4 rounded-lg bg-bg p-4 space-y-2">
              <p className="text-3xl font-bold text-accent">
                {thresholdResult.pctAboveThreshold}%
              </p>
              <p className="text-sm text-muted">
                {thresholdResult.aboveThreshold} of {thresholdResult.presentStudents} present students
                achieved {thresholdResult.threshold}
                {operator === "gte" ? "+" : " above"} in {thresholdResult.subject} ({thresholdResult.yearGroup})
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Combined mode */}
      {mode === "combined" && (
        <Card className="space-y-4">
          <SectionHeader
            title="Combined metric"
            subtitle="% of students meeting grade thresholds across multiple subjects simultaneously."
          />

          {/* Saved presets */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Saved presets</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadPreset(p)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:border-accent/30 hover:bg-surface"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text">Students must meet</span>
            <select
              className="field w-24"
              value={combinedLogic}
              onChange={(e) => setCombinedLogic(e.target.value as "AND" | "OR")}
            >
              <option value="AND">ALL</option>
              <option value="OR">ANY</option>
            </select>
            <span className="text-sm text-muted">of the following rules:</span>
          </div>

          <div className="space-y-3">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  className="field flex-1"
                  placeholder="Subject (e.g. Maths)"
                  value={rule.subject}
                  onChange={(e) => updateRule(i, "subject", e.target.value)}
                />
                <select
                  className="field w-40"
                  value={rule.gradeFormat}
                  onChange={(e) => updateRule(i, "gradeFormat", e.target.value)}
                >
                  {Object.entries(GRADE_FORMAT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input
                  className="field w-24"
                  placeholder={THRESHOLD_EXAMPLES[rule.gradeFormat]}
                  value={rule.threshold}
                  onChange={(e) => updateRule(i, "threshold", e.target.value)}
                />
                <select
                  className="field w-28"
                  value={rule.operator}
                  onChange={(e) => updateRule(i, "operator", e.target.value)}
                >
                  <option value="gte">≥ (at/above)</option>
                  <option value="gt">&gt; (above)</option>
                </select>
                <button
                  onClick={() => removeRule(i)}
                  className="text-muted hover:text-error"
                  aria-label="Remove rule"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRule} className="text-sm text-accent hover:underline">
            + Add rule
          </button>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={runCombinedMetric} disabled={loading}>
              {loading ? "Computing…" : "Compute"}
            </Button>
          </div>

          {combinedResult && (
            <div className="mt-4 rounded-lg bg-bg p-4 space-y-3">
              <p className="text-3xl font-bold text-accent">
                {combinedResult.pctMeetingAllRules}%
              </p>
              <p className="text-sm text-muted">
                {combinedResult.meetingAllRules} of {combinedResult.totalStudents} students
                meeting {combinedLogic === "AND" ? "all" : "any"} criteria
              </p>
              <div className="space-y-1">
                {combinedResult.ruleBreakdown.map((rb, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-accent/40 flex-shrink-0" />
                    <span className="text-text">
                      {rb.rule.subject} {rb.rule.operator === "gte" ? "≥" : ">"} {rb.rule.threshold}:
                    </span>
                    <span className="font-semibold text-accent">{rb.pct}%</span>
                    <span className="text-muted">({rb.count} students)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save as preset */}
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-sm font-medium text-text">Save as preset</p>
            <div className="flex gap-3">
              <input
                className="field flex-1"
                placeholder="Preset name (e.g. Strong Pass Basket)"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <Button variant="ghost" onClick={savePreset} disabled={!presetName}>
                Save
              </Button>
            </div>
            {presetSaved && <p className="text-sm text-success">Preset saved.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
