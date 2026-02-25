"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  "School settings",
  "Enable modules",
  "Upload staff",
  "Behaviour labels",
  "Signal labels",
  "Timetable (optional)",
  "Finish",
] as const;

export default function OnboardingWizardClient({
  stepIndex,
  children,
}: {
  stepIndex: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">School Onboarding</h1>

      {/* Step indicator */}
      <ol className="flex gap-2 overflow-x-auto text-xs">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded px-2 py-1 text-center ${
              i === stepIndex
                ? "bg-slate-900 text-white"
                : i < stepIndex
                ? "bg-slate-200 text-slate-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div>{children}</div>
    </div>
  );
}
