import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { MetaText } from "@/components/ui/typography";
import { StrategyBoardClient } from "./StrategyBoardClient";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function canViewStrategy(role: string): boolean {
  return ["SUPER_ADMIN", "ADMIN", "SLT", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(role);
}

function canManageStrategy(role: string): boolean {
  return ["SUPER_ADMIN", "ADMIN", "SLT", "HEAD_TEACHER"].includes(role);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StrategyPage() {
  const user = await getSessionUserOrThrow();

  if (!canViewStrategy(user.role)) notFound();

  const areas = await (prisma as any).strategyArea.findMany({
    where:   { tenantId: user.tenantId },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [
      { completed: "asc" },
      { createdAt: "desc" },
    ],
  });

  const totalAreas     = areas.length;
  const activeAreas    = areas.filter((a: any) => !a.completed).length;
  const criticalAreas  = areas.filter((a: any) => !a.completed && a.priority === "critical").length;
  const highAreas      = areas.filter((a: any) => !a.completed && a.priority === "high").length;
  const completedAreas = areas.filter((a: any) => a.completed).length;

  const canManage = canManageStrategy(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategy Board"
        subtitle="Senior Leadership · Priority Areas"
      />

      {/* Stats toolbar */}
      <Card className="px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-text">{activeAreas}</span>
              <MetaText>active</MetaText>
            </div>
            {criticalAreas > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                <span className="font-semibold text-text">{criticalAreas}</span>
                <MetaText>critical</MetaText>
              </div>
            )}
            {highAreas > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-text">{highAreas}</span>
                <MetaText>high</MetaText>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
              <span className="font-semibold text-text">{completedAreas}</span>
              <MetaText>complete</MetaText>
            </div>
            <span className="h-4 w-px bg-border" />
            <MetaText>{totalAreas} total</MetaText>
          </div>
        </div>
      </Card>

      {/* Board — client component handles interactivity */}
      <StrategyBoardClient
        areas={areas}
        canManage={canManage}
      />
    </div>
  );
}
