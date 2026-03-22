import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";

export default async function AdminCoachingPage() {
  const user = await requireAdminUser();

  const allUsers = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });

  const assignments = await (prisma as any).coachAssignment.findMany({
    where: { tenantId: user.tenantId },
    include: {
      coach: { select: { id: true, fullName: true } },
      coachee: { select: { id: true, fullName: true } },
    },
    orderBy: [{ coachUserId: "asc" }],
  });

  async function addAssignment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const coachUserId = String(formData.get("coachUserId") || "");
    const coacheeUserId = String(formData.get("coacheeUserId") || "");
    if (!coachUserId || !coacheeUserId || coachUserId === coacheeUserId) return;
    await (prisma as any).coachAssignment.upsert({
      where: { tenantId_coachUserId_coacheeUserId: { tenantId: admin.tenantId, coachUserId, coacheeUserId } },
      update: {},
      create: { tenantId: admin.tenantId, coachUserId, coacheeUserId },
    });
    revalidatePath("/admin/coaching");
  }

  async function removeAssignment(formData: FormData) {
    "use server";
    const admin = await requireAdminUser();
    const coachUserId = String(formData.get("coachUserId"));
    const coacheeUserId = String(formData.get("coacheeUserId"));
    await (prisma as any).coachAssignment.deleteMany({
      where: { tenantId: admin.tenantId, coachUserId, coacheeUserId },
    });
    revalidatePath("/admin/coaching");
  }

  const assignmentList = assignments as any[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaching Assignments"
        subtitle="Manage coach-to-coachee assignment pairs across your institution."
        actions={
          <form action={addAssignment} className="flex items-center gap-2">
            <select
              name="coachUserId"
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text w-44"
              required
            >
              <option value="">Select coach…</option>
              {(allUsers as any[]).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
            <select
              name="coacheeUserId"
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text w-44"
              required
            >
              <option value="">Select coachee…</option>
              {(allUsers as any[]).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
            <Button type="submit" className="gap-2">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 4v12M4 10h12" />
              </svg>
              Add Assignment
            </Button>
          </form>
        }
      />

      {assignmentList.length === 0 ? (
        <EmptyState title="No coaching assignments yet" description="Create your first coach/coachee pair using the form above." />
      ) : (
        <div className="table-shell">
          {/* Table head */}
          <div className="table-head-row grid grid-cols-[1fr_1fr_120px] items-center px-6 py-3">
            <span>Coach</span>
            <span>Coachee</span>
            <span className="text-center">Actions</span>
          </div>

          {/* Table body */}
          {assignmentList.map((a: any) => (
            <div key={`${a.coachUserId}-${a.coacheeUserId}`} className="table-row grid grid-cols-[1fr_1fr_120px] items-center px-6 py-4">
              {/* Coach */}
              <div className="flex items-center gap-3">
                <Avatar name={a.coach?.fullName ?? "?"} size="md" />
                <span className="text-sm font-medium text-text">{a.coach?.fullName}</span>
              </div>

              {/* Coachee */}
              <div className="flex items-center gap-3">
                <Avatar name={a.coachee?.fullName ?? "?"} size="md" />
                <span className="text-sm text-text">{a.coachee?.fullName}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center">
                <form action={removeAssignment}>
                  <input type="hidden" name="coachUserId" value={a.coachUserId} />
                  <input type="hidden" name="coacheeUserId" value={a.coacheeUserId} />
                  <button
                    type="submit"
                    className="rounded-md p-1.5 text-muted calm-transition hover:bg-error/10 hover:text-error"
                    title="Remove assignment"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          ))}

          {/* Footer with count */}
          <div className="flex items-center justify-between border-t border-[var(--surface-container-low)] px-6 py-3">
            <p className="text-sm text-muted">
              Showing <span className="font-semibold text-text">{assignmentList.length}</span> assignment{assignmentList.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
