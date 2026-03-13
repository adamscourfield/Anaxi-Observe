import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { TenantNav } from "@/components/tenant-nav";
import { getOpenOnCallCount } from "@/lib/oncall/badge";
import { canManageLoa } from "@/lib/loa";
import { hasPermission } from "@/lib/rbac";

function userInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserOrThrow();
  const [features, tenant] = await Promise.all([
    prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId, enabled: true } }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }),
  ]);

  const canSeeOnCallBadge = hasPermission(user.role, "oncall:view_all");
  const isApprover = await canManageLoa(user);

  const [onCallCount, leaveCount] = await Promise.all([
    canSeeOnCallBadge ? getOpenOnCallCount(user.tenantId) : Promise.resolve(0),
    isApprover
      ? (prisma as any).lOARequest.count({ where: { tenantId: user.tenantId, status: "PENDING", requesterId: { not: user.id } } })
      : Promise.resolve(0),
  ]);

  const initials = userInitials(user.fullName || user.email || "?");

  return (
    <>
      <TenantNav
        role={user.role}
        enabledFeatures={features.map((f: any) => f.key as any)}
        onCallCount={onCallCount}
        leaveCount={leaveCount}
      />
      <div className="ml-[var(--sidebar-width)] flex min-h-screen flex-col calm-transition" id="tenant-content">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-8 lg:px-10" style={{ boxShadow: "0 1px 0 var(--divider), 0 2px 8px rgba(15,23,42,0.04)" }}>
          {tenant?.name ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-[10px] font-bold text-accent">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-[13px] font-medium text-text">{tenant.name}</span>
            </div>
          ) : <div />}
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-muted sm:block">{user.fullName || user.email}</span>
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white"
              title={user.fullName || user.email}
            >
              {initials}
            </span>
          </div>
        </header>
        <main className="flex-1 px-8 py-8 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
