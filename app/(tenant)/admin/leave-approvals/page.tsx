import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

export default async function AdminLeaveApprovalsPage() {
  const user = await requireAdminUser();

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  const groups = await (prisma as any).leaveApprovalGroup.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: {
      approvers: { include: { approver: { select: { id: true, fullName: true } } } },
      scopes: { include: { subject: { select: { id: true, fullName: true } } } },
    },
  });

  async function createGroup(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const name = String(formData.get("name") || "").trim();
    const appliesTo = String(formData.get("appliesTo") || "ALL_STAFF");
    if (!name) return;
    await (prisma as any).leaveApprovalGroup.create({ data: { tenantId: admin.tenantId, name, appliesTo } });
    revalidatePath("/tenant/admin/leave-approvals");
  }

  async function deleteGroup(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const id = String(formData.get("id"));
    await (prisma as any).leaveApprovalGroup.deleteMany({ where: { id, tenantId: admin.tenantId } });
    revalidatePath("/tenant/admin/leave-approvals");
  }

  async function addApprover(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const groupId = String(formData.get("groupId"));
    const approverUserId = String(formData.get("approverUserId") || "");
    if (!approverUserId) return;
    const grp = await (prisma as any).leaveApprovalGroup.findFirst({ where: { id: groupId, tenantId: admin.tenantId } });
    if (!grp) return;
    await (prisma as any).leaveApprovalGroupMember.upsert({
      where: { groupId_approverUserId: { groupId, approverUserId } },
      update: {},
      create: { tenantId: admin.tenantId, groupId, approverUserId },
    });
    revalidatePath("/tenant/admin/leave-approvals");
  }

  async function removeApprover(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const groupId = String(formData.get("groupId"));
    const approverUserId = String(formData.get("approverUserId"));
    const grp = await (prisma as any).leaveApprovalGroup.findFirst({ where: { id: groupId, tenantId: admin.tenantId } });
    if (!grp) return;
    await (prisma as any).leaveApprovalGroupMember.deleteMany({ where: { groupId, approverUserId } });
    revalidatePath("/tenant/admin/leave-approvals");
  }

  async function addScope(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const groupId = String(formData.get("groupId"));
    const subjectUserId = String(formData.get("subjectUserId") || "");
    if (!subjectUserId) return;
    const grp = await (prisma as any).leaveApprovalGroup.findFirst({ where: { id: groupId, tenantId: admin.tenantId } });
    if (!grp) return;
    await (prisma as any).leaveApprovalGroupScope.upsert({
      where: { groupId_subjectUserId: { groupId, subjectUserId } },
      update: {},
      create: { tenantId: admin.tenantId, groupId, subjectUserId },
    });
    revalidatePath("/tenant/admin/leave-approvals");
  }

  async function removeScope(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const groupId = String(formData.get("groupId"));
    const subjectUserId = String(formData.get("subjectUserId"));
    const grp = await (prisma as any).leaveApprovalGroup.findFirst({ where: { id: groupId, tenantId: admin.tenantId } });
    if (!grp) return;
    await (prisma as any).leaveApprovalGroupScope.deleteMany({ where: { groupId, subjectUserId } });
    revalidatePath("/tenant/admin/leave-approvals");
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Leave approvals" subtitle="Manage approval groups, approvers, and optional scoped staff coverage." />

      <Card>
        <SectionHeader title="Create group" subtitle="Define a group and whether it applies to all staff or selected members." />
        <form action={createGroup} className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Group name (e.g. Teaching staff LOA)" className="rounded-lg border border-border bg-bg px-3 py-2 text-sm" required />
          <select name="appliesTo" className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
            <option value="ALL_STAFF">All staff</option>
            <option value="SELECTED_MEMBERS">Selected members only</option>
          </select>
          <div className="sm:col-span-2">
            <Button type="submit">Create group</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {(groups as any[]).length === 0 ? <EmptyState title="No approval groups yet" description="Create a group above to configure leave approvals." /> : null}

        {(groups as any[]).map((group: any) => {
          const approverIds = new Set<string>((group.approvers as any[]).map((a: any) => a.approverUserId));
          const scopeIds = new Set<string>((group.scopes as any[]).map((s: any) => s.subjectUserId));

          return (
            <Card key={group.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <SectionHeader title={group.name} subtitle={`Applies to: ${group.appliesTo === "ALL_STAFF" ? "All staff" : "Selected members"}`} />
                <form action={deleteGroup}>
                  <input type="hidden" name="id" value={group.id} />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Delete</Button>
                </form>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">Approvers</h3>
                  <ul className="mb-2 space-y-2">
                    {(group.approvers as any[]).map((a: any) => (
                      <li key={a.approverUserId} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                        <span>{a.approver?.fullName}</span>
                        <form action={removeApprover}>
                          <input type="hidden" name="groupId" value={group.id} />
                          <input type="hidden" name="approverUserId" value={a.approverUserId} />
                          <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Remove</Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={addApprover} className="flex gap-2">
                    <input type="hidden" name="groupId" value={group.id} />
                    <select name="approverUserId" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                      <option value="">Add approver…</option>
                      {(allUsers as any[])
                        .filter((u: any) => !approverIds.has(u.id))
                        .map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                    <Button type="submit" variant="secondary">Add</Button>
                  </form>
                </div>

                {group.appliesTo === "SELECTED_MEMBERS" && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">Covered staff</h3>
                    <ul className="mb-2 space-y-2">
                      {(group.scopes as any[]).map((s: any) => (
                        <li key={s.subjectUserId} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                          <span>{s.subject?.fullName}</span>
                          <form action={removeScope}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="subjectUserId" value={s.subjectUserId} />
                            <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">Remove</Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                    <form action={addScope} className="flex gap-2">
                      <input type="hidden" name="groupId" value={group.id} />
                      <select name="subjectUserId" className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                        <option value="">Add staff member…</option>
                        {(allUsers as any[])
                          .filter((u: any) => !scopeIds.has(u.id))
                          .map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                      </select>
                      <Button type="submit" variant="secondary">Add</Button>
                    </form>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
