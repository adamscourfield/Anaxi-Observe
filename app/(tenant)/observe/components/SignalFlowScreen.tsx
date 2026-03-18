"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GLOBAL_SCALE } from "@/modules/observations/signalDefinitions";
import { clearDraft, loadDraft, persistDraft, ScaleKey } from "./observationDraft";
import { ProgressHeader } from "./ProgressHeader";
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

  const hasContext = Boolean(draft.context.teacherId && draft.context.yearGroup && draft.context.subject);

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
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-2xl flex-col gap-0 pt-2 pb-8">
      {/* Progress */}
      <ProgressHeader
        current={currentIndex + 1}
        total={total}
        signalTitle={title}
        canBack={currentIndex > 0}
        onBack={() => goToIndex(currentIndex - 1)}
        onExit={() => {
          if (window.confirm("Exit this observation? Your progress will be lost.")) {
            clearDraft(draftKey);
            router.push("/observe");
          }
        }}
      />

      {/* Context strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          draft.context.subject,
          `Year ${draft.context.yearGroup}`,
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
      <div className="mt-5 mb-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[1.5rem] font-bold leading-snug tracking-tight text-text">{title}</h2>
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
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{description}</p>
      </div>

      {/* Scale tiles */}
      <div className="mt-5 flex-1">
        <SignalTileGroup
          options={scaleOptions}
          selected={pendingValue}
          onSelect={(value) => {
            setPendingValue(value as ScaleKey);
            setPendingNotObserved(false);
          }}
        />
      </div>

      {/* Actions */}
      <div className="mt-5 space-y-3">
        {/* Skip */}
        <button
          type="button"
          onClick={() => {
            setPendingValue(null);
            setPendingNotObserved(true);
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[0.8125rem] font-medium calm-transition ${
            pendingNotObserved
              ? "border-accent/40 bg-accent/5 text-accent"
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

        {/* Next / Review */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={confirmAndAdvance}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-[0.9375rem] font-bold text-white shadow-sm calm-transition hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLastSignal ? "Review observation" : "Next signal"}
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Finish early */}
        {!isLastSignal && answeredCount > 0 && (
          <button
            type="button"
            onClick={finishEarly}
            className="w-full text-center text-[0.75rem] text-muted calm-transition hover:text-text"
          >
            Skip remaining & go to review →
          </button>
        )}
      </div>

      {/* Help sheet */}
      <SignalHelpSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        description={description}
        lookFors={currentSignal.lookFors}
        scaleRows={scaleRows}
      />
    </div>
  );
}
