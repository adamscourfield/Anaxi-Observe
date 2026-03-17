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
import { Card } from "@/components/ui/card";
import { H1, H3, MetaText } from "@/components/ui/typography";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusPill } from "@/components/ui/status-pill";

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
        <Link href="/tenant/meetings" className="text-sm text-accent hover:underline">← Meetings</Link>
      </div>

      <div className="flex items-start justify-between">
        <H1>{meeting.title}</H1>
        <StatusPill variant="neutral">{MEETING_TYPE_LABELS[meeting.type] ?? meeting.type}</StatusPill>
      </div>

      <Card className="space-y-1 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <MetaText>Start</MetaText><span>{new Date(meeting.startDateTime).toLocaleString()}</span>
          <MetaText>End</MetaText><span>{new Date(meeting.endDateTime).toLocaleString()}</span>
          {meeting.location && <><MetaText>Location</MetaText><span>{meeting.location}</span></>}
          <MetaText>Created by</MetaText><span>{meeting.createdBy?.fullName}</span>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Attendees" />
        <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
          {meeting.attendees.map((a: any) => (
            <li key={a.id}>{a.user?.fullName} <span className="text-muted">({a.user?.email})</span></li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionHeader title="Notes" />
        <div className="mt-3">
          <NotesEditor
            meetingId={meeting.id}
            initialNotes={meeting.notes ?? ""}
            canEdit={canEdit}
          />
        </div>
      </Card>

      <Card>
        <SectionHeader title="Actions" />
        <div className="mt-3">
          <ActionList
            actions={meeting.actions ?? []}
            currentUserId={user.id}
          />
          {canAddActions && (
            <div className="mt-4">
              <H3 className="mb-2">Add Action</H3>
              <ActionForm
                meetingId={meeting.id}
                attendees={attendeeUsers}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
