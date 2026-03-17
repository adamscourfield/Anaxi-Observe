"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H2, H3, BodyText } from "@/components/ui/typography";
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
  const speedPromptContinueRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showSpeedPrompt) return;
    speedPromptContinueRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSpeedPrompt(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSpeedPrompt]);

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

      <SignalTileGroup
        options={GLOBAL_SCALE.map((scale) => ({ key: scale.key, label: scale.label }))}
        selected={selected?.valueKey || null}
        onSelect={(value) => saveSignal({ valueKey: value as ScaleKey, notObserved: false })}
      />
      <NotObservedButton onClick={() => saveSignal({ valueKey: null, notObserved: true })} />
      <BodyText className="text-center text-xs text-muted">Use &ldquo;Skip for now&rdquo; if there wasn&rsquo;t enough evidence &mdash; you can revisit any signal in review.</BodyText>

      <SignalHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} description={description} lookFors={currentSignal.lookFors} scaleRows={scaleRows} />

      {showSpeedPrompt ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] p-4 pt-40" role="presentation" onClick={() => setShowSpeedPrompt(false)}>
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="speed-prompt-title"
            className="w-full max-w-md space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <H3 id="speed-prompt-title">Finish quickly?</H3>
            <BodyText className="text-muted">You&rsquo;ve captured the key signals for this lesson phase. Mark the remaining signals as Skipped?</BodyText>
            <div className="flex gap-2">
              <Button
                ref={speedPromptContinueRef}
                type="button"
                onClick={() => {
                  setShowSpeedPrompt(false);
                  goToIndex(currentIndex + 1);
                }}
              >
                Continue reviewing
              </Button>
              <Button
                type="button"
                variant="secondary"
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
                Mark remaining as Skipped
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
