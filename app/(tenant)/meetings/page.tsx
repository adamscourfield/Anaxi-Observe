import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { listMeetings } from "@/modules/meetings/service";
import { MeetingCard } from "@/components/meetings/MeetingCard";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meetings</h1>
        {hasPermission(user.role, "meetings:create") && (
          <Link href="/tenant/meetings/new" className="rounded-lg bg-primaryBtn px-4 py-2 text-sm font-medium text-white hover:bg-primaryBtnHover">
            New Meeting
          </Link>
        )}
      </div>

      <div className="flex gap-3 text-sm">
        <Link className="underline opacity-70 hover:opacity-100" href="/tenant/meetings/actions">My Actions</Link>
        {canViewAll && (
          <>
            <Link className={`underline ${!showAll ? "font-medium" : "opacity-70 hover:opacity-100"}`} href="/tenant/meetings?scope=mine">Mine</Link>
            <Link className={`underline ${showAll ? "font-medium" : "opacity-70 hover:opacity-100"}`} href="/tenant/meetings?scope=all">All</Link>
          </>
        )}
      </div>

      <section>
        <h2 className="mb-2 font-medium">Upcoming</h2>
        <div className="space-y-2">
          {upcoming.map((m: any) => <MeetingCard key={m.id} meeting={m} />)}
          {upcoming.length === 0 && <p className="text-sm opacity-60">No upcoming meetings.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Past</h2>
        <div className="space-y-2">
          {past.map((m: any) => <MeetingCard key={m.id} meeting={m} />)}
          {past.length === 0 && <p className="text-sm opacity-60">No past meetings.</p>}
        </div>
      </section>
    </div>
  );
}
