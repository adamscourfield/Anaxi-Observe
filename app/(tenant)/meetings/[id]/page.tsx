import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { addMeetingAction, markActionDone, updateMeetingNotes } from "../actions";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const meeting = await (prisma as any).meeting.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      attendees: { include: { user: true } },
      actions: { include: { assignedTo: true }, orderBy: { dueDate: "asc" } },
      createdBy: true
    }
  });

  if (!meeting) notFound();
  const isAttendee = (meeting.attendees as any[]).some((attendee) => attendee.userId === user.id);
  if (!isAttendee && user.role === "TEACHER") throw new Error("FORBIDDEN");

  const overdue = (action: any) => action.status !== "DONE" && new Date(action.dueDate) < new Date();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{meeting.title}</h1>
      <div className="rounded border bg-white p-4 text-sm space-y-1">
        <p><strong>Type:</strong> {meeting.meetingType}</p>
        <p><strong>Start:</strong> {new Date(meeting.startAt).toLocaleString()}</p>
        <p><strong>End:</strong> {meeting.endAt ? new Date(meeting.endAt).toLocaleString() : "-"}</p>
        <p><strong>Created by:</strong> {meeting.createdBy?.fullName}</p>
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Attendees</h2>
        <ul className="list-disc pl-5 text-sm">
          {(meeting.attendees as any[]).map((attendee) => (
            <li key={attendee.id}>{attendee.user?.fullName} ({attendee.user?.email})</li>
          ))}
        </ul>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Notes</h2>
        <form action={updateMeetingNotes} className="space-y-2">
          <input type="hidden" name="meetingId" value={meeting.id} />
          <textarea name="notes" rows={6} defaultValue={meeting.notes || ""} className="w-full border p-2 text-sm" />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Save notes</button>
        </form>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Actions</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {(meeting.actions as any[]).map((action) => (
            <li key={action.id} className={`rounded border p-2 ${overdue(action) ? "border-red-400 bg-red-50" : ""}`}>
              <p><strong>{action.actionText}</strong></p>
              <p>Assigned: {action.assignedTo?.fullName}</p>
              <p>Due: {new Date(action.dueDate).toLocaleDateString()} · Status: {action.status}</p>
              {action.status !== "DONE" && action.assignedToId === user.id ? (
                <form action={markActionDone} className="mt-2 flex gap-2">
                  <input type="hidden" name="actionId" value={action.id} />
                  <input name="completionNote" className="flex-1 border p-2" placeholder="Completion note" />
                  <button className="rounded bg-emerald-700 px-3 py-2 text-white" type="submit">Mark done</button>
                </form>
              ) : null}
            </li>
          ))}
          {meeting.actions.length === 0 ? <li className="text-slate-600">No actions yet.</li> : null}
        </ul>

        <form action={addMeetingAction} className="grid grid-cols-2 gap-2 rounded border p-3">
          <input type="hidden" name="meetingId" value={meeting.id} />
          <label className="col-span-2 text-sm">Action text</label>
          <input required name="actionText" className="col-span-2 border p-2" />

          <label className="text-sm">Assign to</label>
          <select required name="assignedToId" className="border p-2">
            <option value="">Select user</option>
            {(meeting.attendees as any[]).map((attendee) => (
              <option key={attendee.userId} value={attendee.userId}>{attendee.user?.fullName}</option>
            ))}
          </select>

          <label className="text-sm">Due date</label>
          <input required name="dueDate" type="date" className="border p-2" />

          <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add action</button>
        </form>
      </section>
    </div>
  );
}
