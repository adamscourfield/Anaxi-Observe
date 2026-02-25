import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { ObservationContextForm } from "../components/ObservationContextForm";

export default async function NewObservationPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const teachers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true, role: "TEACHER" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true }
  });

  const draftKey = `observation-draft:${user.tenantId}:${user.id}`;

  return <ObservationContextForm teachers={teachers as any[]} draftKey={draftKey} signalKeys={SIGNAL_DEFINITIONS.map((s) => s.key)} />;
}
