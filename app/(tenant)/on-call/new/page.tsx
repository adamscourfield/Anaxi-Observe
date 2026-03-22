import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasOnCallPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OnCallRequestForm } from "@/components/oncall/OnCallRequestForm";
import { Button } from "@/components/ui/button";

export default async function OnCallNewPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  if (!hasOnCallPermission(user.role, "oncall:create")) {
    redirect("/on-call");
  }

  const students = await (prisma as any).student.findMany({
    where: { tenantId: user.tenantId, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, upn: true, yearGroup: true },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-text uppercase">
            New Request
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Designed for fast submission — under 15 seconds.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/on-call">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </div>

      <hr className="border-border/60" />

      <OnCallRequestForm students={students} />
    </div>
  );
}
