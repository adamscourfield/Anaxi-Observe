import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasOnCallPermission } from "@/lib/rbac";
import { getRequestDetail } from "@/modules/oncall/service";
import { OnCallDetail } from "@/components/oncall/OnCallDetail";
import { H1 } from "@/components/ui/typography";
import { notFound } from "next/navigation";

export default async function OnCallDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  let request: any;
  try {
    request = await getRequestDetail(user.tenantId, params.id);
  } catch {
    notFound();
  }

  const canAcknowledge = hasOnCallPermission(user.role, "oncall:acknowledge");
  const canResolve = hasOnCallPermission(user.role, "oncall:resolve");
  const canCancel =
    hasOnCallPermission(user.role, "oncall:cancel") && request.requesterUserId === user.id;

  return (
    <div className="space-y-5">
      <H1>On Call Request</H1>
      <OnCallDetail
        request={request}
        canAcknowledge={canAcknowledge}
        canResolve={canResolve}
        canCancel={canCancel}
      />
    </div>
  );
}
