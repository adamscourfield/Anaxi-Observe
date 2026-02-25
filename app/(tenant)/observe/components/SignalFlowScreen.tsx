"use client";

import { useMemo, useState } from "react";
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [showSpeedPrompt, setShowSpeedPrompt] = useState(false);

  const orderedByOrder = useMemo(() => [...signals].sort((a, b) => a.order - b.order), [signals]);
  const draft = useMemo(() => loadDraft(draftKey, orderedByOrder.map((signal) => signal.key)), [draftKey, orderedByOrder]);

  const hasContext = Boolean(draft.context.teacherId && draft.context.yearGroup && draft.context.subject);

  const orderedSignals = useMemo(() => {
    const phaseRelevant = orderedByOrder.filter((signal) => signal.phaseRelevance.includes(draft.context.phase));
    const included = new Set(phaseRelevant.map((signal) => signal.key));
    const universal = orderedByOrder.filter((signal) => signal.isUniversal && !included.has(signal.key));
    for (const signal of universal) included.add(signal.key);
    const other = orderedByOrder.filter((signal) => !included.has(signal.key));
    return { list: [...phaseRelevant, ...universal, ...other], keyCount: phaseRelevant.length + universal.length };
  }, [draft.context.phase, orderedByOrder]);

  const total = orderedSignals.list.length;
  const currentIndex = Math.max(0, Math.min(Number(params.get("index") || "0"), Math.max(total - 1, 0)));
  const currentSignal = orderedSignals.list[currentIndex];

  if (!hasContext) {
    router.replace("/tenant/observe/new");
    return null;
  }

  const goToIndex = (index: number) => router.push(`/tenant/observe/new/signals?index=${Math.max(0, Math.min(index, total - 1))}`);

  const advance = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= total) {
      router.push("/tenant/observe/new/review");
      return;
    }

    if (nextIndex === orderedSignals.keyCount && nextIndex < total) {
      const remaining = orderedSignals.list.slice(nextIndex);
      const hasUnanswered = remaining.some((signal) => {
        const state = draft.signalState[signal.key];
        return !state?.valueKey && !state?.notObserved;
      });
      if (hasUnanswered) {
        setShowSpeedPrompt(true);
        return;
      }
    }

    goToIndex(nextIndex);
  };

  const saveSignal = (entry: { valueKey: ScaleKey | null; notObserved: boolean }) => {
    const next = {
      ...draft,
      signalState: {
        ...draft.signalState,
        [currentSignal.key]: entry,
      },
    };
    persistDraft(draftKey, next);
    advance();
  };

  const override = labelMap[currentSignal.key];
  const title = override?.displayName || currentSignal.displayNameDefault;
  const description = override?.description || currentSignal.descriptionDefault;
  const selected = draft.signalState[currentSignal.key];

  const scaleRows = GLOBAL_SCALE.map((scale) => ({ label: scale.label, guidance: currentSignal.scaleGuidance[scale.key] }));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 bg-bg p-4">
      <ProgressHeader
        current={currentIndex + 1}
        total={total}
        canBack={currentIndex > 0}
        onBack={() => goToIndex(currentIndex - 1)}
        onExit={() => {
          if (window.confirm("Discard observation?")) {
            clearDraft(draftKey);
            router.push("/tenant/observe");
          }
        }}
      />

      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <H2>{title}</H2>
          <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={() => setHelpOpen(true)}>Info</Button>
        </div>
        <BodyText className="line-clamp-2 text-muted">{description}</BodyText>
      </Card>

      <SignalTileGroup
        options={GLOBAL_SCALE.map((scale) => ({ key: scale.key, label: scale.label }))}
        selected={selected?.valueKey || null}
        onSelect={(value) => saveSignal({ valueKey: value as ScaleKey, notObserved: false })}
      />
      <NotObservedButton onClick={() => saveSignal({ valueKey: null, notObserved: true })} />

      <SignalHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} description={description} lookFors={currentSignal.lookFors} scaleRows={scaleRows} />

      {showSpeedPrompt ? (
        <div className="fixed inset-0 z-50 bg-[var(--overlay)] p-4">
          <Card className="mx-auto mt-40 max-w-md">
            <BodyText>You’ve captured the key signals for this lesson phase. Mark the remaining signals as Not Observed?</BodyText>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  const next = { ...draft, signalState: { ...draft.signalState } };
                  for (const signal of orderedSignals.list.slice(orderedSignals.keyCount)) {
                    const state = next.signalState[signal.key];
                    if (!state.valueKey && !state.notObserved) next.signalState[signal.key] = { valueKey: null, notObserved: true };
                  }
                  persistDraft(draftKey, next);
                  router.push("/tenant/observe/new/review");
                }}
              >
                Mark remaining
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowSpeedPrompt(false);
                  goToIndex(currentIndex + 1);
                }}
              >
                Continue reviewing
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
