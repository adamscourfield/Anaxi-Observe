import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { SIGNAL_DEFINITIONS } from "@/modules/observations/signalDefinitions";
import { getTenantSignalLabels } from "@/modules/observations/tenantSignalLabels";
import { submitObservationDraft } from "../../actions";
import { ReviewList } from "../../components/ReviewList";

export default async function ObservationReviewPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "OBSERVATIONS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const draftKey = `observation-draft:${user.tenantId}:${user.id}`;
  const labelMap = await getTenantSignalLabels(user.tenantId);

  return <ReviewList draftKey={draftKey} signals={SIGNAL_DEFINITIONS as any[]} labelMap={labelMap as any} action={submitObservationDraft} />;
}
