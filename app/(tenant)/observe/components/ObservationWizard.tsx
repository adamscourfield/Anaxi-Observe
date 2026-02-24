"use client";

import { useMemo, useState } from "react";
import { SignalCard } from "./SignalCard";

type Teacher = { id: string; fullName: string; email: string };
type Phase = "INSTRUCTION" | "GUIDED_PRACTICE" | "INDEPENDENT_PRACTICE" | "UNKNOWN";
type Signal = {
  key: string;
  order: number;
  displayNameDefault: string;
  descriptionDefault: string;
  lookFors?: string[];
  scale: { key: string; label: string; description: string }[];
  scaleGuidance: Record<string, string>;
  phaseRelevance: Phase[];
  isUniversal: boolean;
};

type LabelMap = Record<string, { displayName: string; description?: string }>;
type SignalEntry = { valueKey: string | null; notObserved: boolean };

type ObservationContext = {
  observedTeacherId: string;
  yearGroup: string;
  subject: string;
  phase: Phase;
  observedAt: string;
  classCode: string;
  contextNote: string;
};

const PHASE_OPTIONS: Phase[] = ["INSTRUCTION", "GUIDED_PRACTICE", "INDEPENDENT_PRACTICE", "UNKNOWN"];

export function ObservationWizard({
  teachers,
  signals,
  labelMap,
  action
}: {
  teachers: Teacher[];
  signals: Signal[];
  labelMap: LabelMap;
  action: (formData: FormData) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [toast, setToast] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [context, setContext] = useState<ObservationContext>({
    observedTeacherId: "",
    yearGroup: "",
    subject: "",
    phase: "UNKNOWN",
    observedAt: "",
    classCode: "",
    contextNote: "",
  });
  const [signalState, setSignalState] = useState<Record<string, SignalEntry>>(() =>
    Object.fromEntries(signals.map((signal) => [signal.key, { valueKey: null, notObserved: false }]))
  );

  const orderedSignals = useMemo(() => [...signals].sort((a, b) => a.order - b.order), [signals]);

  const completed = useMemo(
    () => orderedSignals.filter((signal) => signalState[signal.key]?.valueKey !== null || signalState[signal.key]?.notObserved).length,
    [orderedSignals, signalState]
  );

  const allDone = completed === orderedSignals.length;

  const { phaseFocus, universal, other } = useMemo(() => {
    const focus = orderedSignals.filter((signal) => signal.phaseRelevance.includes(context.phase));
    const usedKeys = new Set(focus.map((signal) => signal.key));

    const universalSignals = orderedSignals.filter((signal) => signal.isUniversal && !usedKeys.has(signal.key));
    for (const signal of universalSignals) usedKeys.add(signal.key);

    const otherSignals = orderedSignals.filter((signal) => !usedKeys.has(signal.key));

    return { phaseFocus: focus, universal: universalSignals, other: otherSignals };
  }, [context.phase, orderedSignals]);

  const setTransientToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const nextFocus = (currentKey: string) => {
    const idx = orderedSignals.findIndex((signal) => signal.key === currentKey);
    const next = orderedSignals[idx + 1];
    if (!next) return;
    const element = document.getElementById(`signal-${next.key}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const markRemaining = () => {
    let changed = 0;
    setSignalState((current) => {
      const next = { ...current };
      for (const signal of orderedSignals) {
        const currentEntry = next[signal.key];
        if (!currentEntry.valueKey && !currentEntry.notObserved) {
          next[signal.key] = { valueKey: null, notObserved: true };
          changed += 1;
        }
      }
      return next;
    });
    setTransientToast(`Marked ${changed} signals as Not Observed.`);
  };

  const clearAllNotObserved = () => {
    let changed = 0;
    setSignalState((current) => {
      const next = { ...current };
      for (const signal of orderedSignals) {
        const currentEntry = next[signal.key];
        if (!currentEntry.valueKey && currentEntry.notObserved) {
          next[signal.key] = { valueKey: null, notObserved: false };
          changed += 1;
        }
      }
      return next;
    });
    setTransientToast(changed ? "Cleared Not Observed." : "No Not Observed signals to clear.");
  };

  const renderSignalList = (sectionSignals: Signal[]) => (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {sectionSignals.map((signal) => {
        const override = labelMap[signal.key];
        const displayName = override?.displayName || signal.displayNameDefault;
        const description = override?.description || signal.descriptionDefault;
        const entry = signalState[signal.key];

        return (
          <div key={signal.key}>
            <input type="hidden" name={`signal_${signal.key}_value`} value={entry?.valueKey || ""} />
            <input type="hidden" name={`signal_${signal.key}_not`} value={entry?.notObserved ? "1" : ""} />
            <SignalCard
              id={`signal-${signal.key}`}
              title={displayName}
              description={description}
              lookFors={signal.lookFors}
              scaleGuidance={signal.scaleGuidance}
              options={signal.scale}
              value={entry?.valueKey || ""}
              notObserved={Boolean(entry?.notObserved)}
              unanswered={!entry?.valueKey && !entry?.notObserved}
              onValue={(value) => {
                setSignalState((current) => ({
                  ...current,
                  [signal.key]: { valueKey: value, notObserved: false }
                }));
                setSubmitError("");
                nextFocus(signal.key);
              }}
              onNotObserved={(checked) => {
                setSignalState((current) => ({
                  ...current,
                  [signal.key]: { valueKey: checked ? null : current[signal.key].valueKey, notObserved: checked }
                }));
                if (checked) setSubmitError("");
              }}
            />
          </div>
        );
      })}
    </div>
  );

  const canContinue = Boolean(context.observedTeacherId && context.yearGroup && context.subject && context.observedAt);

  return (
    <form
      action={action}
      className="space-y-4 rounded border bg-white p-4"
      onSubmit={(event) => {
        if (!allDone) {
          event.preventDefault();
          setSubmitError("Please complete all signals (value or Not Observed).");
        }
      }}
    >
      {step === 1 ? (
        <section className="grid max-w-3xl grid-cols-2 gap-3">
          <h2 className="col-span-2 font-medium">Step 1 · Context</h2>
          <label className="text-sm">Observed teacher</label>
          <select
            name="observedTeacherId"
            className="border p-2"
            required
            value={context.observedTeacherId}
            onChange={(event) => setContext((current) => ({ ...current, observedTeacherId: event.target.value }))}
          >
            <option value="">Select teacher</option>
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName} ({teacher.email})</option>)}
          </select>

          <label className="text-sm">Year group</label>
          <input
            name="yearGroup"
            className="border p-2"
            required
            value={context.yearGroup}
            onChange={(event) => setContext((current) => ({ ...current, yearGroup: event.target.value }))}
          />

          <label className="text-sm">Subject</label>
          <input
            name="subject"
            className="border p-2"
            required
            value={context.subject}
            onChange={(event) => setContext((current) => ({ ...current, subject: event.target.value }))}
          />

          <label className="text-sm">Phase</label>
          <div className="flex flex-wrap gap-2">
            {PHASE_OPTIONS.map((phase) => (
              <label key={phase} className="rounded border px-2 py-1 text-xs">
                <input
                  type="radio"
                  name="phase"
                  value={phase}
                  checked={context.phase === phase}
                  onChange={(event) => setContext((current) => ({ ...current, phase: event.target.value as Phase }))}
                  className="mr-1"
                />
                {phase.replace(/_/g, " ")}
              </label>
            ))}
          </div>

          <label className="text-sm">Observed at</label>
          <input
            type="datetime-local"
            name="observedAt"
            className="border p-2"
            required
            value={context.observedAt}
            onChange={(event) => setContext((current) => ({ ...current, observedAt: event.target.value }))}
          />

          <label className="text-sm">Class code (optional)</label>
          <input
            name="classCode"
            className="border p-2"
            value={context.classCode}
            onChange={(event) => setContext((current) => ({ ...current, classCode: event.target.value }))}
          />

          <button
            type="button"
            className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
            disabled={!canContinue}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </section>
      ) : (
        <section className="space-y-4">
          <input type="hidden" name="observedTeacherId" value={context.observedTeacherId} />
          <input type="hidden" name="yearGroup" value={context.yearGroup} />
          <input type="hidden" name="subject" value={context.subject} />
          <input type="hidden" name="phase" value={context.phase} />
          <input type="hidden" name="observedAt" value={context.observedAt} />
          <input type="hidden" name="classCode" value={context.classCode} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Step 2 · Signals</h2>
            <p className="text-sm">{completed}/{orderedSignals.length} completed</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={markRemaining}>Mark remaining as Not Observed</button>
            <button type="button" className="rounded border px-2 py-1 text-xs" onClick={clearAllNotObserved}>Clear all Not Observed</button>
          </div>
          {toast ? <p className="text-xs text-slate-600">{toast}</p> : null}

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Phase focus</h3>
            {renderSignalList(phaseFocus)}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Universal signals</h3>
            {universal.length ? renderSignalList(universal) : <p className="text-xs text-slate-500">No additional universal signals.</p>}
          </section>

          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">Other signals</summary>
            <div className="pt-2">{other.length ? renderSignalList(other) : <p className="text-xs text-slate-500">No remaining signals.</p>}</div>
          </details>

          <div className="sticky bottom-0 rounded border bg-white p-3">
            <label className="mb-1 block text-xs">Context note (optional)</label>
            <input
              name="contextNote"
              className="mb-2 w-full border p-2"
              placeholder="Optional short note"
              value={context.contextNote}
              onChange={(event) => setContext((current) => ({ ...current, contextNote: event.target.value }))}
            />
            {submitError ? <p className="mb-2 text-xs text-rose-600">{submitError}</p> : null}
            <button disabled={!allDone} className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-40" type="submit">Submit observation</button>
          </div>
        </section>
      )}
    </form>
  );
}
