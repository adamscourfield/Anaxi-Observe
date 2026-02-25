import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels } from "@/modules/observations/tenantSignalLabels";
import { SignalFlowScreen } from "../../components/SignalFlowScreen";

export default async function ObservationSignalsPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const draftKey = `observation-draft:${user.tenantId}:${user.id}`;
  const labelMap = await getTenantSignalLabels(user.tenantId);

  return <SignalFlowScreen draftKey={draftKey} signals={SIGNAL_DEFINITIONS as any[]} labelMap={labelMap as any} />;
}
