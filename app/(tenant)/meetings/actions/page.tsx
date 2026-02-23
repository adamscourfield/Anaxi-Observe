import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { markActionDone } from "../actions";

export default async function MyActionsPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const actions = await (prisma as any).meetingAction.findMany({
    where: { tenantId: user.tenantId, assignedToId: user.id },
    include: { meeting: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 100
  });

  const now = new Date();
  const soonThreshold = new Date(now);
  soonThreshold.setDate(soonThreshold.getDate() + 7);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Actions</h1>
      <ul className="space-y-2 text-sm">
        {(actions as any[]).map((action) => {
          const due = new Date(action.dueDate);
          const isOpen = action.status !== "DONE" && action.status !== "CANCELLED";
          const isOverdue = isOpen && due < now;
          const isDueSoon = isOpen && due >= now && due <= soonThreshold;
          return (
            <li key={action.id} className={`rounded border p-3 ${isOverdue ? "border-red-400 bg-red-50" : isDueSoon ? "border-amber-300 bg-amber-50" : "bg-white"}`}>
              <p className="font-medium">{action.actionText}</p>
              <p>
                Meeting: <Link className="underline" href={`/tenant/meetings/${action.meetingId}`}>{action.meeting?.title || "Meeting"}</Link>
              </p>
              <p>Due: {due.toLocaleDateString()} · Status: {action.status}</p>
              {isOpen ? (
                <form action={markActionDone} className="mt-2 flex gap-2">
                  <input type="hidden" name="actionId" value={action.id} />
                  <input name="completionNote" className="flex-1 border p-2" placeholder="Completion note" />
                  <button className="rounded bg-emerald-700 px-3 py-2 text-white" type="submit">Mark done</button>
                </form>
              ) : (
                <p className="mt-2 text-slate-600">Completed: {action.completedAt ? new Date(action.completedAt).toLocaleDateString() : "-"}</p>
              )}
            </li>
          );
        })}
        {actions.length === 0 ? <li className="rounded border bg-white p-3 text-slate-600">No actions assigned.</li> : null}
      </ul>
    </div>
  );
}
