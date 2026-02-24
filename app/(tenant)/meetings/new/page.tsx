import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createMeeting } from "../actions";

const MEETING_TYPES = ["ONE_TO_ONE", "TEAM", "DEPARTMENT", "PASTORAL", "SLT", "OTHER"] as const;

export default async function NewMeetingPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const users = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create Meeting</h1>
      <form action={createMeeting} className="grid max-w-3xl grid-cols-2 gap-3 rounded border bg-white p-4">
        <label className="text-sm">Title</label>
        <input required name="title" className="border p-2" />

        <label className="text-sm">Meeting type</label>
        <select name="meetingType" className="border p-2" defaultValue="OTHER">
          {MEETING_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>

        <label className="text-sm">Start</label>
        <input required type="datetime-local" name="startAt" className="border p-2" />

        <label className="text-sm">End</label>
        <input type="datetime-local" name="endAt" className="border p-2" />

        <label className="col-span-2 text-sm">Attendees</label>
        <div className="col-span-2 max-h-56 overflow-auto rounded border p-2 text-sm">
          {(users as any[]).map((person) => (
            <label key={person.id} className="mb-1 flex items-center gap-2">
              <input type="checkbox" name="attendeeIds" value={person.id} defaultChecked={person.id === user.id} />
              <span>{person.fullName} ({person.email})</span>
            </label>
          ))}
        </div>

        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white" type="submit">Create meeting</button>
      </form>
    </div>
  );
}
