import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export default async function MeetingsPage({ searchParams }: { searchParams?: { scope?: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const scope = searchParams?.scope === "all" && user.role !== "TEACHER" ? "all" : "mine";

  const meetings = await (prisma as any).meeting.findMany({
    where: {
      tenantId: user.tenantId,
      ...(scope === "all" ? {} : { attendees: { some: { userId: user.id } } })
    },
    include: { attendees: { include: { user: true } }, createdBy: true },
    orderBy: { startAt: "desc" },
    take: 50
  });

  const now = new Date();
  const upcoming = (meetings as any[]).filter((meeting) => new Date(meeting.startAt) >= now);
  const past = (meetings as any[]).filter((meeting) => new Date(meeting.startAt) < now);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Meetings</h1>
      <div className="flex gap-3 text-sm">
        <Link className="underline" href="/tenant/meetings/new">Create meeting</Link>
        <Link className="underline" href="/tenant/meetings/actions">My actions</Link>
        {user.role !== "TEACHER" ? (
          <>
            <Link className="underline" href="/tenant/meetings?scope=mine">Mine</Link>
            <Link className="underline" href="/tenant/meetings?scope=all">All</Link>
          </>
        ) : null}
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Upcoming</h2>
        <ul className="space-y-2 text-sm">
          {upcoming.map((meeting) => (
            <li key={meeting.id}>
              <Link className="underline" href={`/tenant/meetings/${meeting.id}`}>
                {meeting.title} · {meeting.meetingType} · {new Date(meeting.startAt).toLocaleString()}
              </Link>
            </li>
          ))}
          {upcoming.length === 0 ? <li className="text-slate-600">No upcoming meetings.</li> : null}
        </ul>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Past</h2>
        <ul className="space-y-2 text-sm">
          {past.map((meeting) => (
            <li key={meeting.id}>
              <Link className="underline" href={`/tenant/meetings/${meeting.id}`}>
                {meeting.title} · {meeting.meetingType} · {new Date(meeting.startAt).toLocaleString()}
              </Link>
            </li>
          ))}
          {past.length === 0 ? <li className="text-slate-600">No past meetings.</li> : null}
        </ul>
      </section>
    </div>
  );
}
