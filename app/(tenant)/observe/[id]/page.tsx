import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels } from "@/modules/observations/tenantSignalLabels";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { PageHeader } from "@/components/ui/page-header";

export default async function ObservationDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");

  const observation = await (prisma as any).observation.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { observedTeacher: true, observer: true, signals: true }
  });
  if (!observation) notFound();
  if (user.role === "TEACHER" && observation.observedTeacherId !== user.id) throw new Error("FORBIDDEN");
  const labelMap = await getTenantSignalLabels(user.tenantId);

  const signalMap = new Map((observation.signals as any[]).map((signal) => [signal.signalKey, signal]));

  return (
    <div className="space-y-5">
      <PageHeader title="Observation detail" subtitle="Review context and signal-level evidence." />

      <Card className="space-y-1 text-sm">
        <p><strong>Teacher:</strong> {observation.observedTeacher?.fullName}</p>
        <p><strong>Observer:</strong> {observation.observer?.fullName}</p>
        <p><strong>Date:</strong> {new Date(observation.observedAt).toLocaleString()}</p>
        <p><strong>Subject:</strong> {observation.subject}</p>
        <p><strong>Year group:</strong> {observation.yearGroup}</p>
        <p><strong>Phase:</strong> {observation.phase}</p>
        <p><strong>Class code:</strong> {observation.classCode || "-"}</p>
        <p><strong>Context:</strong> {observation.contextNote || "-"}</p>
      </Card>

      <section className="space-y-3">
        <SectionHeader title="Signal records" />
        {(SIGNAL_DEFINITIONS as any[]).map((signal) => {
          const override = (labelMap as any)[signal.key];
          const displayName = override?.displayName || signal.displayNameDefault;
          const description = override?.description || signal.descriptionDefault;
          const value = signalMap.get(signal.key);
          return (
            <Card key={signal.key} className="space-y-1 text-sm">
              <p className="font-medium">{displayName}</p>
              <p className="text-muted">{description}</p>
              <p><strong>Recorded:</strong> {value?.notObserved ? "Not observed" : value?.valueKey || "-"}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
