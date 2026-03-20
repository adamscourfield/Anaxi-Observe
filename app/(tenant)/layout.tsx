import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { TenantNav } from "@/components/tenant-nav";
import { SchoolSwitcher } from "@/components/school-switcher";
import { getOpenOnCallCount } from "@/lib/oncall/badge";
import { canManageLoa } from "@/lib/loa";
import { hasPermission } from "@/lib/rbac";
import { FeatureKey } from "@/lib/types";

type PrismaWithLOA = typeof prisma & {
  lOARequest: { count: (args: { where: Record<string, unknown> }) => Promise<number> };
};
const db = prisma as PrismaWithLOA;

function userInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN:       "Admin",
    SLT:         "Senior Leader",
    HOD:         "Head of Dept",
    LEADER:      "Leader",
    TEACHER:     "Teacher",
    HR:          "HR",
    ON_CALL:     "On Call",
  };
  return map[role] ?? role;
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserOrThrow();
  const [features, tenant, otherMemberships] = await Promise.all([
    prisma.tenantFeature.findMany({ where: { tenantId: user.tenantId, enabled: true } }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }),
    prisma.user.findMany({
      where: { email: user.email, isActive: true },
      select: { tenantId: true, tenant: { select: { name: true } } },
    }),
  ]);

  const canSeeOnCallBadge = hasPermission(user.role, "oncall:view_all");
  const isApprover = await canManageLoa(user);

  const [onCallCount, leaveCount] = await Promise.all([
    canSeeOnCallBadge ? getOpenOnCallCount(user.tenantId) : Promise.resolve(0),
    isApprover
      ? db.lOARequest.count({ where: { tenantId: user.tenantId, status: "PENDING", requesterId: { not: user.id } } })
      : Promise.resolve(0),
  ]);

  const initials = userInitials(user.fullName || user.email || "?");

  const tenantName = tenant?.name || "School";
  const tenantOptions = otherMemberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant?.name || m.tenantId,
    isCurrent: m.tenantId === user.tenantId,
  }));

  return (
    <>
      <TenantNav
        role={user.role}
        enabledFeatures={features.map((f) => f.key as FeatureKey)}
        onCallCount={onCallCount}
        leaveCount={leaveCount}
      />
      <div className="ml-[var(--sidebar-width)] flex min-h-screen flex-col calm-transition" id="tenant-content">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between px-8 glass-surface lg:px-10">
          <SchoolSwitcher currentTenantName={tenantName} tenants={tenantOptions} />
          <Link href="/profile" className="flex items-center gap-3 rounded-[0.75rem] px-2.5 py-1.5 calm-transition hover:bg-[var(--surface-container-low)]">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-[var(--on-surface)]">{user.fullName || user.email}</span>
              <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--outline)]">{formatRole(user.role)}</span>
            </div>
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--on-surface)] text-[11px] font-semibold text-[var(--on-primary)]"
              title={user.fullName || user.email}
            >
              {initials}
            </span>
          </Link>
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
