import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { listMeetings } from "@/modules/meetings/service";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function MeetingsPage({ searchParams }: { searchParams?: { scope?: string; type?: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const canViewAll = hasPermission(user.role, "meetings:view_all");
  const showAll = canViewAll && searchParams?.scope === "all";
  const type = searchParams?.type;

  const meetings = await listMeetings(user.tenantId, {
    type,
    isAttendee: !showAll,
    userId: user.id,
  });

  const now = new Date();
  const upcoming = (meetings as any[]).filter((m) => new Date(m.startDateTime) >= now);
  const past = (meetings as any[]).filter((m) => new Date(m.startDateTime) < now);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meetings"
        subtitle="Track upcoming conversations, outcomes, and follow-up actions."
        actions={
          hasPermission(user.role, "meetings:create") ? (
            <Link href="/meetings/new">
              <Button>New meeting</Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-md border border-border/80 px-3 py-1.5 hover:bg-divider/60" href="/meetings/actions">My actions</Link>
        {canViewAll && (
          <>
            <Link className={`rounded-md border px-3 py-1.5 ${!showAll ? "border-accent bg-[var(--accent-tint)] text-text" : "border-border/80 text-muted hover:bg-divider/60 hover:text-text"}`} href="/meetings?scope=mine">Mine</Link>
            <Link className={`rounded-md border px-3 py-1.5 ${showAll ? "border-accent bg-[var(--accent-tint)] text-text" : "border-border/80 text-muted hover:bg-divider/60 hover:text-text"}`} href="/meetings?scope=all">All</Link>
          </>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted">Upcoming</h2>
        <div className="space-y-2">
          {upcoming.map((m: any) => <MeetingCard key={m.id} meeting={m} />)}
          {upcoming.length === 0 && <EmptyState title="No upcoming meetings" description="Create a meeting to start capturing decisions and actions." />}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted">Past</h2>
        <div className="space-y-2">
          {past.map((m: any) => <MeetingCard key={m.id} meeting={m} />)}
          {past.length === 0 && <EmptyState title="No past meetings" description="Completed meetings will appear here for easy reference." />}
        </div>
      </section>
    </div>
  );
}
