import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { getMyActions, getOverdueActions } from "@/modules/actions/service";
import { MyActionsGrouped } from "@/components/actions/MyActionsGrouped";
import { H1 } from "@/components/ui/typography";

export default async function MyActionsPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const [grouped, overdueCount] = await Promise.all([
    getMyActions(user.tenantId, user.id),
    getOverdueActions(user.tenantId, user.id),
  ]);

  const openCount = grouped.OPEN?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <H1>My Actions</H1>
      </div>
      {overdueCount > 0 && (
        <div className="rounded-xl border border-error/30 bg-[var(--pill-error-bg)] px-4 py-3 text-sm text-[var(--pill-error-text)]">
          You have <strong>{overdueCount}</strong> overdue action{overdueCount !== 1 ? "s" : ""}
        </div>
      )}
      <MyActionsGrouped grouped={grouped as any} currentUserId={user.id} />
    </div>
  );
}
