import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { OBSERVATION_SIGNALS } from "@/modules/observations/signals";

export default async function ObservationDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  const observation = await (prisma as any).observation.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { observedTeacher: true, observer: true, signals: true }
  });
  if (!observation) notFound();
  if (user.role === "TEACHER" && observation.observedTeacherId !== user.id) throw new Error("FORBIDDEN");

  const signalMap = new Map((observation.signals as any[]).map((signal) => [signal.signalKey, signal]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Observation Detail</h1>
      <div className="rounded border bg-white p-4 text-sm space-y-1">
        <p><strong>Teacher:</strong> {observation.observedTeacher?.fullName}</p>
        <p><strong>Observer:</strong> {observation.observer?.fullName}</p>
        <p><strong>Date:</strong> {new Date(observation.observedAt).toLocaleString()}</p>
        <p><strong>Subject:</strong> {observation.subject}</p>
        <p><strong>Year group:</strong> {observation.yearGroup}</p>
        <p><strong>Phase:</strong> {observation.phase}</p>
        <p><strong>Class code:</strong> {observation.classCode || "-"}</p>
        <p><strong>Context:</strong> {observation.contextNote || "-"}</p>
      </div>

      <section className="space-y-2">
        {(OBSERVATION_SIGNALS as any[]).map((signal) => {
          const value = signalMap.get(signal.key);
          return (
            <div className="rounded border bg-white p-3 text-sm" key={signal.key}>
              <p className="font-medium">{signal.label}</p>
              <p className="text-slate-600">{signal.description}</p>
              <p className="mt-1"><strong>Recorded:</strong> {value?.notObserved ? "Not observed" : value?.valueKey || "-"}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
