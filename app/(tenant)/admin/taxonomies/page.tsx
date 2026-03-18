import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

const TABS = ["loa-reasons", "loa-authorisers", "on-call-reasons", "on-call-locations", "on-call-recipients"] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { label: string; icon: JSX.Element; description: string }> = {
  "loa-reasons": {
    label: "LOA Reasons",
    description: "Categories staff can choose when requesting leave.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  "loa-authorisers": {
    label: "LOA Authorisers",
    description: "Staff who can approve or deny leave requests.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 13l2 2 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "on-call-reasons": {
    label: "On Call Reasons",
    description: "Reasons available when creating on-call requests.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  "on-call-locations": {
    label: "On Call Locations",
    description: "Locations available for on-call incident reports.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  "on-call-recipients": {
    label: "On Call Recipients",
    description: "Email addresses that receive on-call notifications.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 6l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

export default async function AdminTaxonomiesPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const user = await requireAdminUser();
  const tab = (TABS.includes((searchParams?.tab as Tab) || "loa-reasons") ? (searchParams?.tab as Tab) : "loa-reasons") as Tab;

  const [loaReasons, onCallReasons, locations, recipients, staff, loaAuthorisers, loaApprovalScopes] = await Promise.all([
    prisma.loaReason.findMany({ where: { tenantId: user.tenantId }, orderBy: { label: "asc" } }),
    (prisma as any).onCallReason.findMany({ where: { tenantId: user.tenantId }, orderBy: { label: "asc" } }),
    (prisma as any).onCallLocation.findMany({ where: { tenantId: user.tenantId }, orderBy: { label: "asc" } }),
    (prisma as any).onCallRecipient.findMany({ where: { tenantId: user.tenantId }, orderBy: { email: "asc" } }),
    (prisma as any).user.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { fullName: "asc" } }),
    (prisma as any).lOAAuthoriser.findMany({ where: { tenantId: user.tenantId }, include: { user: true } }),
    (prisma as any).lOAApprovalScope.findMany({
      where: { tenantId: user.tenantId },
      include: { approver: { select: { id: true, fullName: true, email: true } }, targetUser: { select: { id: true, fullName: true } } },
    }),
  ]);

  // Group scoped approvals by approver
  const scopesByApprover = new Map<string, { approver: any; targets: any[] }>();
  for (const scope of loaApprovalScopes as any[]) {
    const existing = scopesByApprover.get(scope.approverId);
    if (existing) {
      existing.targets.push(scope);
    } else {
      scopesByApprover.set(scope.approverId, { approver: scope.approver, targets: [scope] });
    }
  }

  // ---------- Server Actions ----------

  async function addItem(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const type = String(formData.get("type"));
    const value = String(formData.get("value") || "").trim();
    if (!value) return;
    if (type === "loa") await prisma.loaReason.create({ data: { tenantId: admin.tenantId, label: value } });
    if (type === "reason") await (prisma as any).onCallReason.create({ data: { tenantId: admin.tenantId, label: value } });
    if (type === "location") await (prisma as any).onCallLocation.create({ data: { tenantId: admin.tenantId, label: value } });
    if (type === "recipient") await (prisma as any).onCallRecipient.create({ data: { tenantId: admin.tenantId, email: value } });
    if (type === "loa_authoriser") {
      await (prisma as any).lOAAuthoriser.upsert({
        where: { tenantId_userId: { tenantId: admin.tenantId, userId: value } },
        update: {},
        create: { tenantId: admin.tenantId, userId: value },
      });
    }
    revalidatePath("/admin/taxonomies");
  }

  async function updateItem(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const type = String(formData.get("type"));
    const id = String(formData.get("id"));
    const label = String(formData.get("label") || "").trim();
    if (!id) return;
    if (type === "loa") await prisma.loaReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { label } });
    if (type === "reason") await (prisma as any).onCallReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { label } });
    if (type === "location") await (prisma as any).onCallLocation.updateMany({ where: { id, tenantId: admin.tenantId }, data: { label } });
    if (type === "recipient") await (prisma as any).onCallRecipient.updateMany({ where: { id, tenantId: admin.tenantId }, data: { email: label } });
    revalidatePath("/admin/taxonomies");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const type = String(formData.get("type"));
    const id = String(formData.get("id"));
    const active = String(formData.get("active")) === "true";
    if (!id) return;
    if (type === "loa") await prisma.loaReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    if (type === "reason") await (prisma as any).onCallReason.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    if (type === "location") await (prisma as any).onCallLocation.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    if (type === "recipient") await (prisma as any).onCallRecipient.updateMany({ where: { id, tenantId: admin.tenantId }, data: { active: !active } });
    revalidatePath("/admin/taxonomies");
  }

  async function removeAuthoriser(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    await (prisma as any).lOAAuthoriser.deleteMany({ where: { id, tenantId: admin.tenantId } });
    revalidatePath("/admin/taxonomies");
  }

  async function addScopedAuthoriser(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const approverId = String(formData.get("approverId") || "").trim();
    const targetUserId = String(formData.get("targetUserId") || "").trim();
    if (!approverId || !targetUserId || approverId === targetUserId) return;
    await (prisma as any).lOAApprovalScope.upsert({
      where: { tenantId_approverId_targetUserId: { tenantId: admin.tenantId, approverId, targetUserId } },
      update: {},
      create: { tenantId: admin.tenantId, approverId, targetUserId },
    });
    revalidatePath("/admin/taxonomies");
  }

  async function removeScopedTarget(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    await (prisma as any).lOAApprovalScope.deleteMany({ where: { id, tenantId: admin.tenantId } });
    revalidatePath("/admin/taxonomies");
  }

  async function removeScopedAuthoriser(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const approverId = String(formData.get("approverId"));
    await (prisma as any).lOAApprovalScope.deleteMany({ where: { tenantId: admin.tenantId, approverId } });
    revalidatePath("/admin/taxonomies");
  }

  // ---------- Helpers ----------

  const tabLink = (value: Tab) => {
    const meta = TAB_META[value];
    const active = tab === value;
    return (
      <Link
        key={value}
        href={`/admin/taxonomies?tab=${value}`}
        className={`group flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium calm-transition ${
          active
            ? "border-accent/30 bg-accent/[0.06] text-accent shadow-sm"
            : "border-border bg-white text-muted hover:border-accent/20 hover:bg-accent/[0.03] hover:text-text"
        }`}
      >
        <span className={`shrink-0 ${active ? "text-accent" : "text-muted/60 group-hover:text-accent/60"}`}>
          {meta.icon}
        </span>
        {meta.label}
      </Link>
    );
  };

  const editableTaxonomy = (title: string, type: string, rows: any[], field: "label" | "email") => {
    const activeCount = rows.filter((r) => r.active).length;
    const inactiveCount = rows.length - activeCount;
    const meta = TAB_META[tab];

    return (
      <Card>
        <SectionHeader title={title} subtitle={meta.description} />
        <div className="mb-1 mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {activeCount} active
          </span>
          {inactiveCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              {inactiveCount} inactive
            </span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm calm-transition ${
                row.active
                  ? "border-border/70 bg-white"
                  : "border-border/40 bg-slate-50/60 opacity-70"
              }`}
            >
              <form action={updateItem} className="flex min-w-0 flex-1 items-center gap-2">
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="id" value={row.id} />
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    row.active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <input
                  name="label"
                  defaultValue={row[field]}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                  required
                />
                <Button type="submit" variant="ghost" className="px-3 py-1.5 text-xs">
                  Save
                </Button>
              </form>
              <form action={toggleActive}>
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="active" value={String(row.active)} />
                <button
                  type="submit"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium calm-transition ${
                    row.active
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {row.active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          ))}
          {rows.length === 0 && (
            <EmptyState
              mode="embedded"
              title={`No ${title.toLowerCase()} yet`}
              description={`Add your first item below to get started.`}
            />
          )}
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-accent/30 bg-accent/[0.02] p-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
            Add new {title.slice(0, -1).toLowerCase()}
          </p>
          <form action={addItem} className="flex gap-2">
            <input type="hidden" name="type" value={type} />
            <input
              name="value"
              className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-muted/50 focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              placeholder={`Enter ${field === "email" ? "email address" : "name"}…`}
              required
            />
            <Button type="submit">Add</Button>
          </form>
        </div>
      </Card>
    );
  };

  // ---------- Render ----------

  const globalAuthoriserIds = new Set((loaAuthorisers as any[]).map((a) => a.userId));
  const scopedApproverIds = new Set(scopesByApprover.keys());

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Admin
      </Link>

      <PageHeader
        title="Taxonomies"
        subtitle="Manage configurable values used across leave and on-call workflows."
      />

      <Card tone="subtle" className="flex items-start gap-3 border-accent/20 bg-accent/[0.03]">
        <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-accent">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9v4M10 7h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-muted">
          For group-based approval workflows, use{" "}
          <a className="font-medium text-accent hover:underline" href="/admin/leave-approvals">
            Leave approval rules
          </a>
          . This page manages reasons, locations, recipients, and individual LOA authorisers.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => tabLink(t))}
      </div>

      {tab === "loa-reasons" && editableTaxonomy("LOA Reasons", "loa", loaReasons as any[], "label")}
      {tab === "on-call-reasons" && editableTaxonomy("On Call Reasons", "reason", onCallReasons as any[], "label")}
      {tab === "on-call-locations" && editableTaxonomy("On Call Locations", "location", locations as any[], "label")}
      {tab === "on-call-recipients" && editableTaxonomy("On Call Recipients", "recipient", recipients as any[], "email")}

      {tab === "loa-authorisers" && (
        <div className="space-y-5">
          {/* ── Global authorisers (can approve everyone) ── */}
          <Card>
            <SectionHeader
              title="Global authorisers"
              subtitle="These users can authorise leave for everyone in the school."
            />
            <div className="mt-4 space-y-2">
              {(loaAuthorisers as any[]).map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      {(row.user?.fullName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text">{row.user?.fullName}</p>
                      <p className="text-xs text-muted">{row.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M5 8.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Everyone
                    </span>
                    <form action={removeAuthoriser}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button variant="ghost" type="submit" className="px-2 py-1 text-xs text-muted hover:text-error">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {loaAuthorisers.length === 0 && (
                <EmptyState
                  mode="embedded"
                  title="No global authorisers"
                  description="Add a user below to allow them to approve leave for all staff."
                />
              )}
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-accent/30 bg-accent/[0.02] p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                Add global authoriser
              </p>
              <form action={addItem} className="flex gap-2">
                <input type="hidden" name="type" value="loa_authoriser" />
                <select
                  name="value"
                  className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                  required
                >
                  <option value="">Select a staff member…</option>
                  {(staff as any[])
                    .filter((s) => !globalAuthoriserIds.has(s.id) && !scopedApproverIds.has(s.id))
                    .map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.fullName} ({s.email})
                      </option>
                    ))}
                </select>
                <Button type="submit">Add</Button>
              </form>
            </div>
          </Card>

          {/* ── Scoped authorisers (selected people only) ── */}
          <Card>
            <SectionHeader
              title="Scoped authorisers"
              subtitle="These users can only authorise leave for specific people you assign them."
            />

            <div className="mt-4 space-y-3">
              {Array.from(scopesByApprover.entries()).map(([approverId, { approver, targets }]) => (
                <div key={approverId} className="rounded-xl border border-border/70 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                        {(approver?.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">{approver?.fullName}</p>
                        <p className="text-xs text-muted">{approver?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        {targets.length} {targets.length === 1 ? "person" : "people"}
                      </span>
                      <form action={removeScopedAuthoriser}>
                        <input type="hidden" name="approverId" value={approverId} />
                        <Button variant="ghost" type="submit" className="px-2 py-1 text-xs text-muted hover:text-error">
                          Remove all
                        </Button>
                      </form>
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                      Can authorise leave for:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {targets.map((scope: any) => (
                        <form key={scope.id} action={removeScopedTarget} className="contents">
                          <input type="hidden" name="id" value={scope.id} />
                          <button
                            type="submit"
                            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-slate-50 px-3 py-1.5 text-xs font-medium text-text calm-transition hover:border-error/30 hover:bg-error/5"
                          >
                            {scope.targetUser?.fullName}
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-muted/50 group-hover:text-error">
                              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                          </button>
                        </form>
                      ))}
                    </div>

                    <form action={addScopedAuthoriser} className="mt-3 flex gap-2">
                      <input type="hidden" name="approverId" value={approverId} />
                      <select
                        name="targetUserId"
                        className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                        required
                      >
                        <option value="">Add person…</option>
                        {(staff as any[])
                          .filter((s) => !targets.some((t: any) => t.targetUserId === s.id) && s.id !== approverId)
                          .map((s) => (
                            <option value={s.id} key={s.id}>{s.fullName}</option>
                          ))}
                      </select>
                      <Button type="submit" variant="secondary">Add</Button>
                    </form>
                  </div>
                </div>
              ))}

              {scopesByApprover.size === 0 && (
                <EmptyState
                  mode="embedded"
                  title="No scoped authorisers"
                  description="Add an authoriser below and assign the specific people they can approve leave for."
                />
              )}
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-accent/30 bg-accent/[0.02] p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                Add scoped authoriser
              </p>
              <p className="mb-3 text-xs text-muted">
                Select a staff member as the authoriser, then choose one person they can approve leave for. You can add more people after.
              </p>
              <form action={addScopedAuthoriser} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  name="approverId"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                  required
                >
                  <option value="">Authoriser…</option>
                  {(staff as any[])
                    .filter((s) => !globalAuthoriserIds.has(s.id))
                    .map((s) => (
                      <option value={s.id} key={s.id}>{s.fullName}</option>
                    ))}
                </select>
                <select
                  name="targetUserId"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                  required
                >
                  <option value="">Covered person…</option>
                  {(staff as any[]).map((s) => (
                    <option value={s.id} key={s.id}>{s.fullName}</option>
                  ))}
                </select>
                <Button type="submit">Add</Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
