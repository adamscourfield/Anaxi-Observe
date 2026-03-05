import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { TenantNav } from "@/components/tenant-nav";
import { getOpenOnCallCount } from "@/lib/oncall/badge";
import { canManageLoa } from "@/lib/loa";
import { hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

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
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });

  const canSeeOnCallBadge = hasPermission(user.role, "oncall:view_all");
  const isApprover = await canManageLoa(user);

  const [onCallCount, leaveCount] = await Promise.all([
    canSeeOnCallBadge ? getOpenOnCallCount(user.tenantId) : Promise.resolve(0),
    isApprover
      ? (prisma as any).lOARequest.count({ where: { tenantId: user.tenantId, status: "PENDING", requesterId: { not: user.id } } })
      : Promise.resolve(0),
  ]);

  const notificationCount = onCallCount + leaveCount;

  return (
    <div className="flex items-start gap-4 lg:gap-6">
      <TenantNav
        role={user.role}
        enabledFeatures={features.map((f: any) => f.key as any)}
        onCallCount={onCallCount}
        leaveCount={leaveCount}
      />

      <section className="min-w-0 flex-1 space-y-4 lg:space-y-6">
        <header className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
          <div>
            <p className="text-sm text-muted">Welcome back, {user.fullName?.split(" ")[0] ?? "there"}</p>
            <p className="text-xs text-muted">Here’s what’s happening at {tenant?.name ?? "your school"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
              <span className="mr-2 text-muted">School</span>
              <span>{tenant?.name ?? "Current school"}</span>
            </div>

            <details className="relative">
              <summary className="list-none rounded-lg border border-border bg-primaryBtn px-3 py-2 text-sm font-medium text-white cursor-pointer">
                + Create
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-md">
                <Link href="/observe" className="block rounded-md px-2 py-1.5 text-sm hover:bg-divider">New observation</Link>
                <Link href="/on-call/new" className="block rounded-md px-2 py-1.5 text-sm hover:bg-divider">New on-call request</Link>
                <Link href="/leave/request" className="block rounded-md px-2 py-1.5 text-sm hover:bg-divider">New leave request</Link>
                <Link href="/meetings/new" className="block rounded-md px-2 py-1.5 text-sm hover:bg-divider">New meeting</Link>
              </div>
            </details>

            <Link href="/on-call/feed" className="relative rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-divider">
              Notifications
              {notificationCount > 0 ? (
                <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{notificationCount}</span>
              ) : null}
            </Link>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[var(--surface-subtle)] text-xs font-semibold text-text">
              {initials(user.fullName).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="panel p-4 lg:p-6">{children}</div>
      </section>
    </div>
  );
}
