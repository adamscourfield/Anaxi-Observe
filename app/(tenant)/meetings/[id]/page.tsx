import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { getMeetingDetail } from "@/modules/meetings/service";
import { MEETING_TYPE_LABELS } from "@/modules/meetings/types";
import { NotesEditor } from "@/components/meetings/NotesEditor";
import { ActionList } from "@/components/actions/ActionList";
import { ActionForm } from "@/components/actions/ActionForm";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  let meeting: any;
  try {
    meeting = await getMeetingDetail(user.tenantId, params.id);
  } catch {
    notFound();
  }

  const isAttendee = meeting.attendees.some((a: any) => a.userId === user.id);
  const isCreator = meeting.createdByUserId === user.id;
  const canViewAll = hasPermission(user.role, "meetings:view_all");
  if (!isCreator && !isAttendee && !canViewAll) notFound();

  const canEdit = isCreator || user.role === "ADMIN";
  const canAddActions = hasPermission(user.role, "actions:create") && (isCreator || isAttendee);

  const attendeeUsers = meeting.attendees.map((a: any) => a.user);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/tenant/meetings" className="text-sm opacity-60 hover:opacity-100">← Meetings</Link>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-xl font-semibold">{meeting.title}</h1>
        <span className="rounded-full bg-divider px-2 py-0.5 text-xs">
          {MEETING_TYPE_LABELS[meeting.type] ?? meeting.type}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 text-sm space-y-1">
        <p><strong>Start:</strong> {new Date(meeting.startDateTime).toLocaleString()}</p>
        <p><strong>End:</strong> {new Date(meeting.endDateTime).toLocaleString()}</p>
        {meeting.location && <p><strong>Location:</strong> {meeting.location}</p>}
        <p><strong>Created by:</strong> {meeting.createdBy?.fullName}</p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 font-medium">Attendees</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {meeting.attendees.map((a: any) => (
            <li key={a.id}>{a.user?.fullName} <span className="opacity-60">({a.user?.email})</span></li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-medium">Notes</h2>
        <NotesEditor
          meetingId={meeting.id}
          initialNotes={meeting.notes ?? ""}
          canEdit={canEdit}
        />
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-medium">Actions</h2>
        <ActionList
          actions={meeting.actions ?? []}
          currentUserId={user.id}
        />
        {canAddActions && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium">Add Action</h3>
            <ActionForm
              meetingId={meeting.id}
              attendees={attendeeUsers}
            />
          </div>
        )}
      </section>
    </div>
  );
}
