import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export default async function AdminLeaveApprovalsPage() {
  const user = await requireAdminUser();

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true }
  });

  const groups = await (prisma as any).leaveApprovalGroup.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: {
      approvers: { include: { approver: { select: { id: true, fullName: true } } } },
      scopes: { include: { subject: { select: { id: true, fullName: true } } } }
    }
  });

  async function createGroup(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const name = String(formData.get("name") || "").trim();
    const appliesTo = String(formData.get("appliesTo") || "ALL_STAFF");
    if (!name) return;
    await (prisma as any).leaveApprovalGroup.create({
      data: { tenantId: admin.tenantId, name, appliesTo }
    });
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
      create: { tenantId: admin.tenantId, groupId, approverUserId }
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
      create: { tenantId: admin.tenantId, groupId, subjectUserId }
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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Leave Approval Groups</h1>

      <form action={createGroup} className="grid max-w-lg grid-cols-2 gap-2">
        <input
          name="name"
          placeholder="Group name (e.g. Teaching staff LOA)"
          className="rounded border p-2 text-sm"
          required
        />
        <select name="appliesTo" className="rounded border p-2 text-sm">
          <option value="ALL_STAFF">All staff</option>
          <option value="SELECTED_MEMBERS">Selected members only</option>
        </select>
        <button type="submit" className="col-span-2 rounded bg-slate-900 px-4 py-2 text-sm text-white">
          Create group
        </button>
      </form>

      <div className="space-y-4">
        {(groups as any[]).length === 0 && (
          <p className="text-sm text-slate-500">No approval groups yet.</p>
        )}
        {(groups as any[]).map((group: any) => {
          const approverIds = new Set<string>((group.approvers as any[]).map((a: any) => a.approverUserId));
          const scopeIds = new Set<string>((group.scopes as any[]).map((s: any) => s.subjectUserId));

          return (
            <div key={group.id} className="rounded border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{group.name}</h2>
                  <span className="text-xs text-slate-500">
                    Applies to: {group.appliesTo === "ALL_STAFF" ? "All staff" : "Selected members"}
                  </span>
                </div>
                <form action={deleteGroup}>
                  <input type="hidden" name="id" value={group.id} />
                  <button type="submit" className="text-sm text-red-600 underline">Delete</button>
                </form>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-sm font-medium">Approvers</h3>
                  <ul className="mb-2 space-y-1">
                    {(group.approvers as any[]).map((a: any) => (
                      <li key={a.approverUserId} className="flex items-center justify-between text-sm">
                        <span>{a.approver?.fullName}</span>
                        <form action={removeApprover}>
                          <input type="hidden" name="groupId" value={group.id} />
                          <input type="hidden" name="approverUserId" value={a.approverUserId} />
                          <button type="submit" className="text-red-600 underline">Remove</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={addApprover} className="flex gap-2">
                    <input type="hidden" name="groupId" value={group.id} />
                    <select name="approverUserId" className="flex-1 rounded border p-1 text-sm">
                      <option value="">Add approver…</option>
                      {(allUsers as any[])
                        .filter((u: any) => !approverIds.has(u.id))
                        .map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                    <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-sm text-white">Add</button>
                  </form>
                </div>

                {group.appliesTo === "SELECTED_MEMBERS" && (
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Covered staff</h3>
                    <ul className="mb-2 space-y-1">
                      {(group.scopes as any[]).map((s: any) => (
                        <li key={s.subjectUserId} className="flex items-center justify-between text-sm">
                          <span>{s.subject?.fullName}</span>
                          <form action={removeScope}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="subjectUserId" value={s.subjectUserId} />
                            <button type="submit" className="text-red-600 underline">Remove</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                    <form action={addScope} className="flex gap-2">
                      <input type="hidden" name="groupId" value={group.id} />
                      <select name="subjectUserId" className="flex-1 rounded border p-1 text-sm">
                        <option value="">Add staff member…</option>
                        {(allUsers as any[])
                          .filter((u: any) => !scopeIds.has(u.id))
                          .map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                      </select>
                      <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-sm text-white">Add</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
