import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { TenantNav } from "@/components/tenant-nav";
import { getOpenOnCallCount } from "@/lib/oncall/badge";
import { canManageLoa } from "@/lib/loa";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getSessionUserOrThrow>>;
  try {
    user = await getSessionUserOrThrow();
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw e;
  }
  const features = await prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId, enabled: true } });

  const canSeeOnCallBadge = hasPermission(user.role, "oncall:view_all");
  const isApprover = await canManageLoa(user);

  const [onCallCount, leaveCount] = await Promise.all([
    canSeeOnCallBadge ? getOpenOnCallCount(user.tenantId) : Promise.resolve(0),
    isApprover
      ? (prisma as any).lOARequest.count({ where: { tenantId: user.tenantId, status: "PENDING", requesterId: { not: user.id } } })
      : Promise.resolve(0),
  ]);

  return (
    <div className="flex items-start gap-4 lg:gap-6">
      <TenantNav
        role={user.role}
        enabledFeatures={features.map((f: any) => f.key as any)}
        onCallCount={onCallCount}
        leaveCount={leaveCount}
      />
      <section className="min-w-0 flex-1 rounded-xl border border-border/70 bg-surface/70 p-4 shadow-sm backdrop-blur-sm lg:p-6">
        {children}
      </section>
    </div>
  );
}
