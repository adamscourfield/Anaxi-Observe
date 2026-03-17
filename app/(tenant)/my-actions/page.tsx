import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { getMyActions, getOverdueActions } from "@/modules/actions/service";
import { MyActionsGrouped } from "@/components/actions/MyActionsGrouped";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";

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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="My actions"
        subtitle="Stay on top of meeting follow-ups and deadlines."
        meta={
          <>
            <StatusPill variant="neutral">{openCount} open</StatusPill>
            {overdueCount > 0 ? <StatusPill variant="warning">{overdueCount} overdue</StatusPill> : <StatusPill variant="success">On track</StatusPill>}
          </>
        }
        actions={
          <Link href="/tenant/meetings" className="rounded-xl border border-border/70 bg-bg/20 px-3.5 py-2 text-sm text-muted hover:bg-divider/60 hover:text-text">
            Meetings
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open", value: openCount, tone: "text-text", meta: "Needs attention" },
          { label: "Blocked", value: blockedCount, tone: "text-warning", meta: "Waiting on unblock" },
          { label: "Done", value: doneCount, tone: "text-success", meta: "Completed" },
        ].map((item) => (
          <Card key={item.label} tone="subtle" className="p-4">
            <div className="space-y-1">
              <p className={`text-3xl font-semibold tracking-[-0.02em] ${item.value > 0 ? item.tone : "text-muted"}`}>{item.value}</p>
              <p className="text-xs uppercase tracking-[0.08em] text-muted">{item.label}</p>
              <p className="text-xs text-muted">{item.meta}</p>
            </div>
          </Card>
        ))}
      </div>

      {overdueCount > 0 && (
        <div className="rounded-2xl border border-error/35 bg-[var(--pill-error-bg)] px-4 py-3 text-sm text-[var(--pill-error-text)]">
          You have <strong>{overdueCount}</strong> overdue action{overdueCount !== 1 ? "s" : ""}.
        </div>
      )}

      <MyActionsGrouped grouped={grouped as any} currentUserId={user.id} />
    </div>
  );
}
