import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { getMyActions, getOverdueActions } from "@/modules/actions/service";
import { MyActionsGrouped } from "@/components/actions/MyActionsGrouped";
import Link from "next/link";

export default async function MyActionsPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const [grouped, overdueCount] = await Promise.all([
    getMyActions(user.tenantId, user.id),
    getOverdueActions(user.tenantId, user.id),
  ]);

  const openCount = grouped.OPEN?.length ?? 0;
  const blockedCount = grouped.BLOCKED?.length ?? 0;
  const doneCount = grouped.DONE?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Actions</h1>
        <Link href="/tenant/meetings" className="text-sm opacity-60 hover:opacity-100 underline">
          Meetings
        </Link>
      </div>

      <div className="flex gap-6">
        <div className="text-center">
          <p className={`text-3xl font-bold ${openCount > 0 ? "text-text" : "opacity-40 text-text"}`}>{openCount}</p>
          <p className="text-xs opacity-60">Open</p>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-bold ${blockedCount > 0 ? "text-yellow-600" : "opacity-40 text-text"}`}>{blockedCount}</p>
          <p className="text-xs opacity-60">Blocked</p>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-bold ${doneCount > 0 ? "text-green-600" : "opacity-40 text-text"}`}>{doneCount}</p>
          <p className="text-xs opacity-60">Done</p>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ You have <strong>{overdueCount}</strong> overdue action{overdueCount !== 1 ? "s" : ""}
        </div>
      )}

      <MyActionsGrouped grouped={grouped as any} currentUserId={user.id} />
    </div>
  );
}
