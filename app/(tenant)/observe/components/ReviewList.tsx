"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadDraft, persistDraft } from "./observationDraft";
import { ObservationStageLayout } from "./ObservationStageLayout";

type Signal = { key: string; order: number; displayNameDefault: string };
type LabelMap = Record<string, { displayName: string; description?: string }>;

const SCALE_DISPLAY: Record<string, { label: string; color: string; dot: string; text: string }> = {
  LIMITED:    { label: "Limited",    color: "bg-scale-limited-light text-scale-limited-text",       dot: "bg-scale-limited-bar",    text: "text-scale-limited-text" },
  SOME:       { label: "Some",       color: "bg-scale-some-light text-scale-some-text",             dot: "bg-scale-some-bar",       text: "text-scale-some-text" },
  CONSISTENT: { label: "Consistent", color: "bg-scale-consistent-light text-scale-consistent-text", dot: "bg-scale-consistent-bar", text: "text-scale-consistent-text" },
  STRONG:     { label: "Strong",     color: "bg-scale-strong-light text-scale-strong-text",         dot: "bg-scale-strong-bar",     text: "text-scale-strong-text" },
};

// Generic signal icon — simple eye/observe motif
function SignalIcon() {
  return (
    <svg className="h-4 w-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12s3.636-7 10-7 10 7 10 7-3.636 7-10 7S2 12 2 12z" />
    </svg>
  );
}

export function ReviewList({
  draftKey,
  signals,
  labelMap,
  action,
}: {
  draftKey: string;
  signals: Signal[];
  labelMap: LabelMap;
  action: (formData: FormData) => void;
}) {
  const router = useRouter();
  const orderedSignals = useMemo(() => [...signals].sort((a, b) => a.order - b.order), [signals]);
  const [draft, setDraft] = useState(() => loadDraft(draftKey, orderedSignals.map((s) => s.key)));

  const completed = orderedSignals.filter((s) => {
    const st = draft.signalState[s.key];
    return st?.valueKey || st?.notObserved;
  }).length;

  const rated = orderedSignals.filter((s) => draft.signalState[s.key]?.valueKey).length;
  const skipped = orderedSignals.filter((s) => draft.signalState[s.key]?.notObserved && !draft.signalState[s.key]?.valueKey).length;
  const allDone = completed === orderedSignals.length;
  const remaining = orderedSignals.length - completed;

  // Format session context label
  const yearLabel = draft.context.yearGroup
    ? draft.context.yearGroup.replace(/^Y(\d+)$/i, "Year $1")
    : draft.context.classCode;
  const sessionLabel = [yearLabel, draft.context.subject].filter(Boolean).join(" — ");

  return (
    <ObservationStageLayout currentStep={3}>
      <form action={action}>
        {/* Hidden context fields */}
        <input type="hidden" name="observedTeacherId" value={draft.context.teacherId} />
        <input type="hidden" name="yearGroup" value={draft.context.yearGroup || draft.context.classCode} />
        <input type="hidden" name="subject" value={draft.context.subject} />
        <input type="hidden" name="phase" value={draft.context.phase} />
        <input type="hidden" name="classCode" value={draft.context.classCode} />
        <input type="hidden" name="observedAt" value={draft.context.observedAt} />

        {/* Hidden signal values (for form submission) */}
        {orderedSignals.map((signal) => {
          const state = draft.signalState[signal.key];
          return (
            <span key={signal.key}>
              <input type="hidden" name={`signal_${signal.key}_value`} value={state?.valueKey || ""} />
              <input type="hidden" name={`signal_${signal.key}_not`} value={state?.notObserved ? "1" : ""} />
            </span>
          );
        })}

        {/* Section heading */}
        <div className="mb-6">
          <h2 className="text-[1.375rem] font-bold text-text">Review &amp; Submit</h2>
          <p className="mt-1 text-[0.875rem] text-muted">
            Please verify the captured signals and provide final concluding reflections before finalizing this session.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">

          {/* ── Left: Signal Summary ── */}
          <div className="overflow-hidden rounded-2xl glass-card">
            <div className="flex items-center justify-between border-b border-border/20 px-6 py-4">
              <h3 className="text-[0.875rem] font-semibold text-text">Signal Summary</h3>
              <button
                type="button"
                onClick={() => router.push("/observe/new/signals")}
                className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Observations
              </button>
            </div>

            {/* Signal grid — 2 columns on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {orderedSignals.map((signal, index) => {
                const state = draft.signalState[signal.key];
                const displayName = labelMap[signal.key]?.displayName || signal.displayNameDefault;
                const scaleKey = state?.valueKey;
                const display = scaleKey ? SCALE_DISPLAY[scaleKey] : null;
                const isSkipped = state?.notObserved && !state?.valueKey;

                // Border logic for 2-column grid
                const total = orderedSignals.length;
                const isEven = index % 2 === 0; // left column
                const lastRowStart = total % 2 === 0 ? total - 2 : total - 1;
                const isLastRow = index >= lastRowStart;

                return (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => router.push(`/observe/new/signals?index=${index}`)}
                    className={[
                      "group flex items-center justify-between gap-3 px-5 py-3.5 text-left calm-transition hover:bg-surface-container-lowest/50",
                      !isLastRow ? "border-b border-border/20" : "",
                      isEven ? "sm:border-r sm:border-border/20" : "",
                    ].join(" ")}
                  >
                    {/* Icon + name */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low">
                        <SignalIcon />
                      </div>
                      <span className="truncate text-[0.8125rem] font-medium text-text">{displayName}</span>
                    </div>

                    {/* Rating indicator */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        display ? display.dot :
                        isSkipped ? "bg-outline-variant" :
                        "bg-surface-container-high"
                      }`} />
                      <span className={`text-[0.75rem] font-semibold ${
                        display ? display.text :
                        isSkipped ? "text-muted" :
                        "text-muted"
                      }`}>
                        {display ? display.label : isSkipped ? "Skipped" : "Pending"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: Concluding Notes + Context + Actions ── */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl glass-card">
              {/* Textarea */}
              <div className="px-6 pt-5 pb-4">
                <label className="block text-[0.875rem] font-semibold text-text">
                  Concluding Notes
                </label>
                <p className="mt-0.5 text-[0.75rem] text-muted">
                  Enter final reflections on the observation session, identifying key strengths and immediate areas for intervention.
                </p>
                <textarea
                  name="contextNote"
                  className="field mt-3 min-h-[120px] resize-y"
                  placeholder="Enter final reflections on the observation session, identifying key strengths and immediate areas for intervention…"
                  rows={5}
                  value={draft.context.contextNote}
                  onChange={(e) => {
                    const next = { ...draft, context: { ...draft.context, contextNote: e.target.value } };
                    setDraft(next);
                    persistDraft(draftKey, next);
                  }}
                />
                <div className="mt-2 flex items-center justify-end">
                  <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted">
                    Required
                  </span>
                </div>
              </div>

              {/* Session context */}
              <div className="border-t border-border/20 px-6 py-4">
                <p className="mb-2.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted">
                  Session Context
                </p>
                <div className="space-y-2">
                  {sessionLabel && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[0.75rem] text-muted">Class</span>
                      <span className="text-right text-[0.75rem] font-semibold text-text">{sessionLabel}</span>
                    </div>
                  )}
                  {draft.context.observedAt && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[0.75rem] text-muted">Date</span>
                      <span className="text-right text-[0.75rem] font-semibold text-text">
                        {new Date(draft.context.observedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[0.75rem] text-muted">Signals rated</span>
                    <span className="text-right text-[0.75rem] font-semibold text-text">
                      {rated} rated{skipped > 0 ? `, ${skipped} skipped` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={!allDone}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[0.875rem] font-semibold text-on-primary shadow-sm calm-transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Submit Observation
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="flex w-full items-center justify-center gap-2 text-[0.875rem] font-medium text-muted calm-transition hover:text-text"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Signals
              </button>
            </div>

            {/* Incomplete warning */}
            {!allDone && (
              <div className="flex items-center gap-2 rounded-xl border border-scale-some-border bg-scale-some-bg px-4 py-3">
                <svg className="h-4 w-4 shrink-0 text-scale-some-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-[0.8125rem] text-scale-some-text">
                  {remaining} signal{remaining !== 1 ? "s" : ""} still need a rating or skip.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </ObservationStageLayout>
  );
}
