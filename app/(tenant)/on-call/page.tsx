import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasOnCallPermission } from "@/lib/rbac";
import { getRequestsByStatus } from "@/modules/oncall/service";
import { OnCallInbox } from "@/components/oncall/OnCallInbox";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function OnCallHomePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const canAcknowledge = hasOnCallPermission(user.role, "oncall:acknowledge");
  const canResolve = hasOnCallPermission(user.role, "oncall:resolve");

  const { data: requests } = await getRequestsByStatus(user.tenantId, undefined, 100, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="On call"
        subtitle="Triage incidents quickly and keep response ownership clear."
        actions={
          <Link href="/on-call/new">
            <Button>New request</Button>
          </Link>
        }
      />

      <OnCallInbox
        requests={requests}
        canAcknowledge={canAcknowledge}
        canResolve={canResolve}
      />
    </div>
  );
}
