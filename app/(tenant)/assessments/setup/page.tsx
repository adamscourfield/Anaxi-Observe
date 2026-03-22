"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";

type Step = "cycle" | "points" | "done";

export default function AssessmentSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cycle");
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleLabel, setCycleLabel] = useState("");

  // Cycle form
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  // Points form
  const [points, setPoints] = useState([
    { label: "Autumn 1", assessedAt: "" },
    { label: "Spring 1", assessedAt: "" },
    { label: "Summer 1", assessedAt: "" },
  ]);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    setCycleError(null);
    setCycleLoading(true);

    try {
      const res = await fetch("/api/assessments/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, startDate, endDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCycleError(data.error || "Failed to create cycle");
        return;
      }
      const data = await res.json();
      setCycleId(data.cycle.id);
      setCycleLabel(data.cycle.label);
      setStep("points");
    } finally {
      setCycleLoading(false);
    }
  }

  async function handleCreatePoints(e: React.FormEvent) {
    e.preventDefault();
    if (!cycleId) return;
    setPointsError(null);
    setPointsLoading(true);

    const filledPoints = points.filter((p) => p.label.trim() && p.assessedAt);
    if (filledPoints.length === 0) {
      setPointsError("Add at least one assessment point with a date.");
      setPointsLoading(false);
      return;
    }

    try {
      for (let i = 0; i < filledPoints.length; i++) {
        const res = await fetch("/api/assessments/points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cycleId,
            label: filledPoints[i].label,
            ordinal: i + 1,
            assessedAt: filledPoints[i].assessedAt,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setPointsError(data.error || `Failed to create point "${filledPoints[i].label}"`);
          return;
        }
      }
      setStep("done");
    } finally {
      setPointsLoading(false);
    }
  }

  function addPoint() {
    setPoints((prev) => [...prev, { label: "", assessedAt: "" }]);
  }

  function updatePoint(i: number, field: "label" | "assessedAt", value: string) {
    setPoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function removePoint(i: number) {
    setPoints((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (step === "done") {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Cycle created" subtitle={`"${cycleLabel}" is ready for assessments.`} />
        <Card className="space-y-4">
          <p className="text-sm text-muted">
            Assessment points have been set up. You can now upload results for each point.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/assessments")}>View cycles</Button>
            <Button variant="ghost" onClick={() => router.push("/assessments/setup")}>
              Create another cycle
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Set Up Assessment Cycle"
        subtitle="An assessment cycle is an academic year. Within it, you'll define assessment points (e.g. Autumn 1, Spring 2)."
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className={step === "cycle" ? "font-semibold text-accent" : "text-muted"}>
          1. Cycle
        </span>
        <span className="text-muted">→</span>
        <span className={step === "points" ? "font-semibold text-accent" : "text-muted"}>
          2. Assessment points
        </span>
      </div>

      {step === "cycle" && (
        <Card className="space-y-4">
          <SectionHeader title="Create a cycle" subtitle="Usually one per academic year." />
          <form onSubmit={handleCreateCycle} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">Cycle label</label>
              <input
                className="field w-full"
                placeholder="e.g. 2025/26"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text">Start date</label>
                <input
                  type="date"
                  className="field w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text">End date</label>
                <input
                  type="date"
                  className="field w-full"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            {cycleError && <p className="text-sm text-error">{cycleError}</p>}
            <Button type="submit" disabled={cycleLoading}>
              {cycleLoading ? "Creating…" : "Create cycle"}
            </Button>
          </form>
        </Card>
      )}

      {step === "points" && (
        <Card className="space-y-4">
          <SectionHeader
            title="Assessment points"
            subtitle="Add the key assessment moments within this cycle. You can always add more later."
          />
          <form onSubmit={handleCreatePoints} className="space-y-4">
            <div className="space-y-3">
              {points.map((point, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    className="field flex-1"
                    placeholder="Label (e.g. Autumn 1)"
                    value={point.label}
                    onChange={(e) => updatePoint(i, "label", e.target.value)}
                  />
                  <input
                    type="date"
                    className="field w-44"
                    value={point.assessedAt}
                    onChange={(e) => updatePoint(i, "assessedAt", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removePoint(i)}
                    className="text-muted hover:text-error"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPoint}
              className="text-sm text-accent hover:underline"
            >
              + Add point
            </button>
            {pointsError && <p className="text-sm text-error">{pointsError}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={pointsLoading}>
                {pointsLoading ? "Saving…" : "Save points"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep("done")}>
                Skip for now
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
