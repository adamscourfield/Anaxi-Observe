"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GLOBAL_SCALE } from "@/modules/observations/signalDefinitions";
import { clearDraft, loadDraft, persistDraft, ScaleKey } from "./observationDraft";
import { ObservationStageLayout } from "./ObservationStageLayout";
import { SignalHelpSheet } from "./SignalHelpSheet";
import { SignalTileGroup } from "./SignalTileGroup";

type Signal = {
  key: string;
  order: number;
  displayNameDefault: string;
  descriptionDefault: string;
  lookFors?: string[];
  scaleGuidance: Record<string, string>;
  phaseRelevance: string[];
  isUniversal: boolean;
};

type LabelMap = Record<string, { displayName: string; description?: string }>;

export function SignalFlowScreen({
  draftKey,
  signals,
  labelMap,
}: {
  draftKey: string;
  signals: Signal[];
  labelMap: LabelMap;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendingValue, setPendingValue] = useState<ScaleKey | null>(null);
  const [pendingNotObserved, setPendingNotObserved] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const orderedByOrder = useMemo(() => [...signals].sort((a, b) => a.order - b.order), [signals]);
  const signalKeys = useMemo(() => orderedByOrder.map((s) => s.key), [orderedByOrder]);
  const [draft, setDraft] = useState(() => loadDraft(draftKey, signalKeys));

  const hasContext = Boolean(draft.context.teacherId && draft.context.department && draft.context.classCode);

  const orderedSignals = useMemo(() => {
    const phaseRelevant = orderedByOrder.filter((s) => s.phaseRelevance.includes(draft.context.phase));
    const included = new Set(phaseRelevant.map((s) => s.key));
    const universal = orderedByOrder.filter((s) => s.isUniversal && !included.has(s.key));
    const list = [...phaseRelevant, ...universal];
    return list;
  }, [draft.context.phase, orderedByOrder]);

  const total = orderedSignals.length;
  const currentIndex = Math.max(0, Math.min(Number(params.get("index") || "0"), Math.max(total - 1, 0)));
  const currentSignal = orderedSignals[currentIndex];

  useEffect(() => {
    const saved = draft.signalState[currentSignal?.key];
    if (saved?.notObserved) {
      setPendingNotObserved(true);
      setPendingValue(null);
    } else if (saved?.valueKey) {
      setPendingValue(saved.valueKey);
      setPendingNotObserved(false);
    } else {
      setPendingValue(null);
      setPendingNotObserved(false);
    }
  }, [currentIndex, currentSignal?.key, draft.signalState]);

  if (!hasContext) {
    router.replace("/observe/new");
    return null;
  }

  const goToIndex = (index: number) =>
    router.push(`/observe/new/signals?index=${Math.max(0, Math.min(index, total - 1))}`);

  const advance = () => {
    if (currentIndex + 1 >= total) {
      router.push("/observe/new/review");
    } else {
      goToIndex(currentIndex + 1);
    }
  };

  const finishEarly = () => {
    const next = { ...draft, signalState: { ...draft.signalState } };
    for (const signal of orderedSignals.slice(currentIndex + 1)) {
      const state = next.signalState[signal.key];
      if (!state?.valueKey && !state?.notObserved) {
        next.signalState[signal.key] = { valueKey: null, notObserved: true };
      }
    }
    updateDraft(next);
    router.push("/observe/new/review");
  };

  const updateDraft = (updated: typeof draft) => {
    setDraft(updated);
    persistDraft(draftKey, updated);
  };

  const confirmAndAdvance = () => {
    const entry = pendingNotObserved
      ? { valueKey: null, notObserved: true }
      : { valueKey: pendingValue, notObserved: false };
    updateDraft({
      ...draft,
      signalState: { ...draft.signalState, [currentSignal.key]: entry },
    });
    advance();
  };

  const hasSelection = pendingValue !== null || pendingNotObserved;
  const isLastSignal = currentIndex === total - 1;

  const override = labelMap[currentSignal.key];
  const title = override?.displayName || currentSignal.displayNameDefault;
  const description = override?.description || currentSignal.descriptionDefault;

  const scaleRows = GLOBAL_SCALE.map((scale) => ({
    label: scale.label,
    guidance: currentSignal.scaleGuidance[scale.key],
  }));

  const scaleOptions = GLOBAL_SCALE.map((scale) => ({
    key: scale.key,
    label: scale.label,
    guidance: currentSignal.scaleGuidance[scale.key] || scale.description,
  }));

  // Count answered signals for the "finish early" hint
  const answeredCount = orderedSignals.filter((s) => {
    const st = draft.signalState[s.key];
    return st?.valueKey || st?.notObserved;
  }).length;

  return (
    <ObservationStageLayout currentStep={2}>
      {/* Main Card */}
      <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm">
        <div className="px-8 py-7">
          {/* Stage Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-text" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16l4-8 4 6 4-10 4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 className="text-[1.125rem] font-bold tracking-tight text-text">
                  Stage 2: Criteria &amp; Metrics
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Exit this observation? Your progress will be lost.")) {
                    clearDraft(draftKey);
                    router.push("/home");
                  }
                }}
                className="flex items-center gap-2 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Exit
              </button>
            </div>
            <p className="mt-1.5 ml-[30px] text-[0.875rem] text-muted">
              Rate each teaching signal on the observed criteria.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.75rem] font-semibold text-muted">
                Signal {currentIndex + 1} of {total}
              </span>
              <span className="text-[0.75rem] font-medium text-muted">
                {answeredCount} completed
              </span>
            </div>
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full calm-transition ${
                    i <= currentIndex ? "bg-[#1e293b]" : "bg-border/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Context strip */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {[
              draft.context.subject,
              draft.context.classCode,
              draft.context.phase !== "UNKNOWN"
                ? draft.context.phase.replace("_", " ").toLowerCase()
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

          {/* Signal header */}
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[1.375rem] font-bold leading-snug tracking-tight text-text">{title}</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-white/70 px-2.5 py-1.5 text-[0.75rem] font-medium text-muted calm-transition hover:border-accent/30 hover:text-accent"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M6.5 6.5a1.5 1.5 0 1 1 1.5 1.5v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
                </svg>
                Guide
              </button>
            </div>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">{description}</p>
          </div>

          {/* Scale tiles */}
          <div className="mb-5">
            <SignalTileGroup
              options={scaleOptions}
              selected={pendingValue}
              onSelect={(value) => {
                setPendingValue(value as ScaleKey);
                setPendingNotObserved(false);
              }}
            />
          </div>

          {/* Skip */}
          <button
            type="button"
            onClick={() => {
              setPendingValue(null);
              setPendingNotObserved(true);
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[0.8125rem] font-medium calm-transition ${
              pendingNotObserved
                ? "border-[#1e293b]/40 bg-[#1e293b]/5 text-[#1e293b]"
                : "border-dashed border-border bg-transparent text-muted hover:border-muted hover:text-text"
            }`}
          >
            {pendingNotObserved ? (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Skipped — tap a rating above to change
              </>
            ) : (
              "Skip this signal"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/20 px-8 py-5">
          <button
            type="button"
            onClick={() => {
              if (currentIndex > 0) goToIndex(currentIndex - 1);
              else router.push("/observe/new");
            }}
            className="flex items-center gap-2 text-[0.875rem] font-medium text-muted calm-transition hover:text-text"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {currentIndex > 0 ? "Previous" : "Back to Details"}
          </button>
          <div className="flex items-center gap-3">
            {!isLastSignal && answeredCount > 0 && (
              <button
                type="button"
                onClick={finishEarly}
                className="text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
              >
                Skip to review →
              </button>
            )}
            <button
              type="button"
              disabled={!hasSelection}
              onClick={confirmAndAdvance}
              className="flex items-center gap-2 rounded-xl bg-[#1e293b] px-6 py-3 text-[0.875rem] font-semibold text-white shadow-sm calm-transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastSignal ? "Review & Submit" : "Next Signal"}
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Help sheet */}
      <SignalHelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        description={description}
        lookFors={currentSignal.lookFors}
        scaleRows={scaleRows}
      />
    </ObservationStageLayout>
  );
}
