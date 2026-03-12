import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { TenantNav } from "@/components/tenant-nav";
import { getOpenOnCallCount } from "@/lib/oncall/badge";
import { canManageLoa } from "@/lib/loa";
import { hasPermission } from "@/lib/rbac";

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserOrThrow();
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
      <section
        className="min-w-0 flex-1 rounded-[28px] border border-border/60 bg-surface/40 p-3 shadow-sm backdrop-blur-sm lg:p-4"
        style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)" }}
      >
        <div className="min-w-0 rounded-[24px] border border-border/50 bg-bg/18 p-4 lg:p-5">{children}</div>
      </section>
    </div>
  );
}
