"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H2, BodyText } from "@/components/ui/typography";
import { GLOBAL_SCALE } from "@/modules/observations/signalDefinitions";
import { clearDraft, loadDraft, persistDraft, ScaleKey } from "./observationDraft";
import { NotObservedButton } from "./NotObservedButton";
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

export function SignalFlowScreen({ draftKey, signals, labelMap }: { draftKey: string; signals: Signal[]; labelMap: LabelMap }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendingValue, setPendingValue] = useState<ScaleKey | null>(null);
  const [pendingNotObserved, setPendingNotObserved] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const orderedByOrder = useMemo(() => [...signals].sort((a, b) => a.order - b.order), [signals]);
  const signalKeys = useMemo(() => orderedByOrder.map((signal) => signal.key), [orderedByOrder]);
  const [draft, setDraft] = useState(() => loadDraft(draftKey, signalKeys));

  const hasContext = Boolean(draft.context.teacherId && draft.context.yearGroup && draft.context.subject);

  const orderedSignals = useMemo(() => {
    const phaseRelevant = orderedByOrder.filter((signal) => signal.phaseRelevance.includes(draft.context.phase));
    const included = new Set(phaseRelevant.map((signal) => signal.key));
    const universal = orderedByOrder.filter((signal) => signal.isUniversal && !included.has(signal.key));
    const list = [...phaseRelevant, ...universal];
    return { list, keyCount: list.length };
  }, [draft.context.phase, orderedByOrder]);

  const total = orderedSignals.list.length;
  const currentIndex = Math.max(0, Math.min(Number(params.get("index") || "0"), Math.max(total - 1, 0)));
  const currentSignal = orderedSignals.list[currentIndex];

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

  const goToIndex = (index: number) => router.push(`/observe/new/signals?index=${Math.max(0, Math.min(index, total - 1))}`);

  const advance = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= total) {
      router.push("/observe/new/review");
      return;
    }
    goToIndex(nextIndex);
  };

  const finishEarly = () => {
    const next = { ...draft, signalState: { ...draft.signalState } };
    for (const signal of orderedSignals.list.slice(currentIndex + 1)) {
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
    const next = {
      ...draft,
      signalState: {
        ...draft.signalState,
        [currentSignal.key]: entry,
      },
    };
    updateDraft(next);
    advance();
  };

  const hasSelection = pendingValue !== null || pendingNotObserved;
  const isLastSignal = currentIndex === total - 1;

  const override = labelMap[currentSignal.key];
  const title = override?.displayName || currentSignal.displayNameDefault;
  const description = override?.description || currentSignal.descriptionDefault;

  const scaleRows = GLOBAL_SCALE.map((scale) => ({ label: scale.label, guidance: currentSignal.scaleGuidance[scale.key] }));

  const infoPanel = (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Guidance</p>
      <p className="text-sm text-muted">{description}</p>
      {currentSignal.lookFors?.length ? (
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-1.5">Look for</p>
          <ul className="list-disc pl-4 space-y-1 text-sm text-muted">
            {currentSignal.lookFors.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Scale guidance</p>
        {scaleRows.map((row) => (
          <div key={row.label} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-medium text-text">{row.label}</p>
            <p className="text-xs text-muted mt-0.5">{row.guidance}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 bg-bg p-4">
      <ProgressHeader
        current={currentIndex + 1}
        total={total}
        canBack={currentIndex > 0}
        onBack={() => goToIndex(currentIndex - 1)}
        onExit={() => {
          if (window.confirm("Discard observation?")) {
            clearDraft(draftKey);
            router.push("/observe/history");
          }
        }}
      />

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <H2>{title}</H2>
          <Button type="button" variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={() => setHelpOpen(true)}>
            <svg viewBox="0 0 16 16" fill="none" className="mr-1 h-3.5 w-3.5"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M6.5 6.5a1.5 1.5 0 1 1 1.5 1.5v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="11.5" r="0.5" fill="currentColor" /></svg>
            Info
          </Button>
        </div>
        <BodyText className="line-clamp-2 text-muted">{description}</BodyText>
      </Card>

      <div className="flex items-stretch gap-6">
        <div className="flex-1 space-y-3">
          <SignalTileGroup
            options={GLOBAL_SCALE.map((scale) => ({ key: scale.key, label: scale.label }))}
            selected={pendingValue}
            onSelect={(value) => {
              setPendingValue(value as ScaleKey);
              setPendingNotObserved(false);
            }}
          />
          <NotObservedButton
            onClick={() => {
              setPendingValue(null);
              setPendingNotObserved(true);
            }}
            active={pendingNotObserved}
          />
          <BodyText className="text-center text-xs text-muted">Use &ldquo;Skip for now&rdquo; if there wasn&rsquo;t enough evidence &mdash; you can revisit any signal in review.</BodyText>

          <Button
            type="button"
            disabled={!hasSelection}
            onClick={confirmAndAdvance}
            className="w-full"
          >
            {isLastSignal ? "Review observation →" : "Next →"}
          </Button>
          {!isLastSignal && (
            <Button
              type="button"
              variant="ghost"
              onClick={finishEarly}
              className="w-full text-xs"
            >
              Complete &amp; review now →
            </Button>
          )}

          <div id="signal-info-panel" className="md:hidden">
            {infoPanel}
          </div>
        </div>

        <aside className="hidden md:block w-80 shrink-0">
          <Card className="h-full space-y-3 overflow-y-auto">
            {infoPanel}
          </Card>
        </aside>
      </div>

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
