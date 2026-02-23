import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { LESSON_PHASES, OBSERVATION_SIGNALS } from "@/modules/observations/signals";
import { createObservation } from "../actions";

function prettyPhase(phase: string) {
  return phase.toLowerCase().replace(/_/g, " ");
}

export default async function NewObservationPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const teachers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true, role: { in: ["TEACHER", "LEADER", "SLT", "ADMIN"] } },
    orderBy: { fullName: "asc" }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Observation</h1>
      <form action={createObservation} className="space-y-4 rounded border bg-white p-4">
        <section className="grid max-w-3xl grid-cols-2 gap-3">
          <h2 className="col-span-2 font-medium">Step 1 · Teacher</h2>
          <label className="text-sm">Observed teacher</label>
          <select name="observedTeacherId" className="border p-2" required>
            <option value="">Select teacher</option>
            {(teachers as any[]).map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.fullName} ({teacher.email})</option>
            ))}
          </select>
        </section>

        <section className="grid max-w-3xl grid-cols-2 gap-3">
          <h2 className="col-span-2 font-medium">Step 2 · Lesson context</h2>
          <label className="text-sm">Observed at</label>
          <input type="datetime-local" name="observedAt" className="border p-2" required />

          <label className="text-sm">Subject</label>
          <input name="subject" className="border p-2" required />

          <label className="text-sm">Year group</label>
          <input name="yearGroup" className="border p-2" required />

          <label className="text-sm">Phase</label>
          <select name="phase" className="border p-2" defaultValue="OTHER">
            {LESSON_PHASES.map((phase) => (
              <option key={phase} value={phase}>{prettyPhase(phase)}</option>
            ))}
          </select>

          <label className="text-sm">Class code (optional)</label>
          <input name="classCode" className="border p-2" />

          <label className="col-span-2 text-sm">Context note (optional)</label>
          <textarea name="contextNote" className="col-span-2 border p-2" rows={3} />
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Step 3 · 12 signals</h2>
          <p className="text-xs text-slate-600">Select a value for each signal, or mark Not observed.</p>
          {(OBSERVATION_SIGNALS as any[]).map((signal) => (
            <div key={signal.key} className="rounded border p-3">
              <div className="mb-2">
                <p className="font-medium">{signal.label}</p>
                <p className="text-xs text-slate-600">{signal.description}</p>
                <p className="text-xs text-slate-500">{signal.universal ? "Universal" : `Phase-specific: ${signal.phases.join(", ")}`}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {(signal.values as any[]).map((value) => (
                  <label key={value.key} className="flex items-center gap-1">
                    <input type="radio" name={`signal_${signal.key}_value`} value={value.key} />
                    <span>{value.label}</span>
                  </label>
                ))}
                <label className="ml-2 flex items-center gap-1">
                  <input type="checkbox" name={`signal_${signal.key}_not`} value="1" />
                  <span>Not observed</span>
                </label>
              </div>
            </div>
          ))}
        </section>

        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Create observation</button>
      </form>
    </div>
  );
}
