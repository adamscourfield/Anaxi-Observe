import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels } from "@/modules/observations/tenantSignalLabels";
import { createObservation } from "../actions";
import { ObservationWizard } from "../components/ObservationWizard";

export default async function NewObservationPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const [teachers, labelMap] = await Promise.all([
    (prisma as any).user.findMany({
      where: { tenantId: user.tenantId, isActive: true, role: { in: ["TEACHER", "LEADER", "SLT", "ADMIN"] } },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true }
    }),
    getTenantSignalLabels(user.tenantId)
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Observation</h1>
      <ObservationWizard teachers={teachers as any[]} signals={SIGNAL_DEFINITIONS as any[]} labelMap={labelMap as any} action={createObservation} />
    </div>
  );
}
