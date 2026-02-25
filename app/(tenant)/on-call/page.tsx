import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasOnCallPermission } from "@/lib/rbac";
import { getRequestsByStatus } from "@/modules/oncall/service";
import { OnCallInbox } from "@/components/oncall/OnCallInbox";
import { Button } from "@/components/ui/button";
import { H1 } from "@/components/ui/typography";

export default async function OnCallHomePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const canAcknowledge = hasOnCallPermission(user.role, "oncall:acknowledge");
  const canResolve = hasOnCallPermission(user.role, "oncall:resolve");

  const { data: requests } = await getRequestsByStatus(user.tenantId, undefined, 100, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <H1>On Call</H1>
        <Link href="/tenant/on-call/new">
          <Button>New Request</Button>
        </Link>
      </div>

      <OnCallInbox
        requests={requests as any[]}
        canAcknowledge={canAcknowledge}
        canResolve={canResolve}
      />
    </div>
  );
}
