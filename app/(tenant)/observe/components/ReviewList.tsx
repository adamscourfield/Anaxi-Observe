"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H1, MetaText, Label } from "@/components/ui/typography";
import { TileOption } from "@/components/ui/tile-option";
import { GLOBAL_SCALE } from "@/modules/observations/signalDefinitions";
import { loadDraft, persistDraft } from "./observationDraft";

type Signal = { key: string; order: number; displayNameDefault: string };
type LabelMap = Record<string, { displayName: string; description?: string }>;

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
  const [draft, setDraft] = useState(() => loadDraft(draftKey, orderedSignals.map((signal) => signal.key)));

  const completed = orderedSignals.filter((signal) => {
    const state = draft.signalState[signal.key];
    return state?.valueKey || state?.notObserved;
  }).length;

  const allDone = completed === orderedSignals.length;

  return (
    <Card className="mx-auto max-w-2xl">
      <form action={action} className="space-y-5">
        <div className="flex items-center justify-between">
          <H1 className="text-[20px]">Review observation</H1>
          <MetaText className="font-medium">{completed}/{orderedSignals.length} complete</MetaText>
        </div>
        <MetaText>Tap any signal row to revise your judgement before submitting.</MetaText>

        <input type="hidden" name="observedTeacherId" value={draft.context.teacherId} />
        <input type="hidden" name="yearGroup" value={draft.context.yearGroup} />
        <input type="hidden" name="subject" value={draft.context.subject} />
        <input type="hidden" name="phase" value={draft.context.phase} />
        <input type="hidden" name="classCode" value={draft.context.classCode} />

        <div className="space-y-2">
          {orderedSignals.map((signal, index) => {
            const state = draft.signalState[signal.key];
            const selectedLabel = state?.notObserved
              ? "Skipped"
              : GLOBAL_SCALE.find((scale) => scale.key === state?.valueKey)?.label || "Not answered";
            const displayName = labelMap[signal.key]?.displayName || signal.displayNameDefault;

            return (
              <TileOption
                key={signal.key}
                type="button"
                className="flex w-full items-center justify-between p-3 text-sm"
                onClick={() => router.push(`/observe/new/signals?index=${index}`)}
              >
                <span className="font-medium">{displayName}</span>
                <span className={`text-xs ${state?.valueKey ? "text-accent" : state?.notObserved ? "text-muted" : "text-warning"}`}>{selectedLabel}</span>
                <input type="hidden" name={`signal_${signal.key}_value`} value={state?.valueKey || ""} />
                <input type="hidden" name={`signal_${signal.key}_not`} value={state?.notObserved ? "1" : ""} />
              </TileOption>
            );
          })}
        </div>

        <div>
          <Label>Context note <span className="font-normal text-muted">(optional)</span></Label>
          <textarea
            name="contextNote"
            className="field"
            rows={3}
            value={draft.context.contextNote}
            onChange={(event) => {
              const next = { ...draft, context: { ...draft.context, contextNote: event.target.value } };
              setDraft(next);
              persistDraft(draftKey, next);
            }}
          />
        </div>

        <Button disabled={!allDone} className="w-full" type="submit">
          Submit observation
        </Button>
      </form>
    </Card>
  );
}
