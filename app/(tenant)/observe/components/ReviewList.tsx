"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadDraft, persistDraft } from "./observationDraft";
import { ObservationStageLayout } from "./ObservationStageLayout";

type Signal = { key: string; order: number; displayNameDefault: string };
type LabelMap = Record<string, { displayName: string; description?: string }>;

const SCALE_DISPLAY: Record<string, { label: string; color: string; dot: string }> = {
  LIMITED:    { label: "Limited",    color: "bg-rose-100 text-rose-700",    dot: "bg-rose-500" },
  SOME:       { label: "Some",       color: "bg-amber-100 text-amber-700",   dot: "bg-amber-500" },
  CONSISTENT: { label: "Consistent", color: "bg-blue-100 text-blue-700",     dot: "bg-blue-600" },
  STRONG:     { label: "Strong",     color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-600" },
};

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

  return (
    <ObservationStageLayout currentStep={3}>
      <form action={action} className="space-y-0">
        {/* Hidden context fields for form submission */}
        <input type="hidden" name="observedTeacherId" value={draft.context.teacherId} />
        <input type="hidden" name="yearGroup" value={draft.context.yearGroup || draft.context.classCode} />
        <input type="hidden" name="subject" value={draft.context.subject} />
        <input type="hidden" name="phase" value={draft.context.phase} />
        <input type="hidden" name="classCode" value={draft.context.classCode} />
        <input type="hidden" name="observedAt" value={draft.context.observedAt} />

        {/* Main Card */}
        <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
          <div className="px-8 py-7">
            {/* Stage Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-text" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <h2 className="text-[1.125rem] font-bold tracking-tight text-text">
                      Stage 3: Review &amp; Submit
                    </h2>
                  </div>
                  <p className="mt-1.5 ml-[30px] text-[0.875rem] text-muted">
                    Tap any row to revise a rating before submitting.
                  </p>
                </div>
                {/* Completion summary */}
                <div className="shrink-0 rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-center backdrop-blur-sm">
                  <div className="text-[1.375rem] font-bold tabular-nums text-text">{rated}</div>
                  <div className="text-[0.6875rem] font-medium text-muted">rated</div>
                  {skipped > 0 && <div className="mt-0.5 text-[0.6875rem] text-muted">{skipped} skipped</div>}
                </div>
              </div>
            </div>

            {/* Context summary */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {[
                draft.context.subject,
                draft.context.classCode,
                draft.context.phase !== "UNKNOWN"
                  ? draft.context.phase.replace(/_/g, " ").toLowerCase()
                  : null,
              ]
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/50 bg-white/60 px-2.5 py-0.5 text-[0.6875rem] font-medium text-muted"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Signal rows */}
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
              {orderedSignals.map((signal, index) => {
                const state = draft.signalState[signal.key];
                const displayName = labelMap[signal.key]?.displayName || signal.displayNameDefault;
                const scaleKey = state?.valueKey;
                const display = scaleKey ? SCALE_DISPLAY[scaleKey] : null;
                const isSkipped = state?.notObserved && !state?.valueKey;
                const isLast = index === orderedSignals.length - 1;

                return (
                  <button
                    key={signal.key}
                    type="button"
                    onClick={() => router.push(`/observe/new/signals?index=${index}`)}
                    className={`group flex w-full items-center gap-4 px-5 py-3.5 text-left calm-transition hover:bg-white/50 ${!isLast ? "border-b border-border/30" : ""}`}
                  >
                    {/* Status dot */}
                    <span className={`h-2 w-2 shrink-0 rounded-full ${
                      display ? display.dot :
                      isSkipped ? "bg-slate-300" :
                      "bg-amber-400"
                    }`} />

                    {/* Name */}
                    <span className="flex-1 text-[0.875rem] font-medium text-text">{displayName}</span>

                    {/* Rating badge or status */}
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${
                      display ? display.color :
                      isSkipped ? "bg-slate-100 text-slate-500" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {display ? display.label : isSkipped ? "Skipped" : "Tap to rate"}
                    </span>

                    <svg className="h-3.5 w-3.5 shrink-0 text-border calm-transition group-hover:text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {/* Hidden form values */}
                    <input type="hidden" name={`signal_${signal.key}_value`} value={state?.valueKey || ""} />
                    <input type="hidden" name={`signal_${signal.key}_not`} value={state?.notObserved ? "1" : ""} />
                  </button>
                );
              })}
            </div>

            {/* Context note */}
            <div className="mt-5 space-y-2">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Concluding Notes <span className="font-normal normal-case tracking-normal">· optional</span>
              </label>
              <textarea
                name="contextNote"
                className="field min-h-[80px] resize-y"
                placeholder="Any contextual notes — cover, timing, disruptions, strengths observed…"
                rows={3}
                value={draft.context.contextNote}
                onChange={(e) => {
                  const next = { ...draft, context: { ...draft.context, contextNote: e.target.value } };
                  setDraft(next);
                  persistDraft(draftKey, next);
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/20 px-8 py-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[0.875rem] font-medium text-muted calm-transition hover:text-text"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Signals
            </button>
            <button
              type="submit"
              disabled={!allDone}
              className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-6 py-3 text-[0.875rem] font-semibold text-white shadow-sm calm-transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Submit Observation
            </button>
          </div>
        </div>

        {/* Warning */}
        {!allDone && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <svg className="h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-[0.8125rem] text-amber-800">
              {orderedSignals.length - completed} signal{orderedSignals.length - completed !== 1 ? "s" : ""} still need a rating or skip.
            </p>
          </div>
        )}
      </form>
    </ObservationStageLayout>
  );
}
