import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { getMeetingDetail } from "@/modules/meetings/service";
import { MEETING_TYPE_LABELS } from "@/modules/meetings/types";
import { LiveMeetingView } from "@/components/meetings/LiveMeetingView";

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

  const typeLabel = MEETING_TYPE_LABELS[meeting.type] ?? meeting.type;

  return (
    <div>
      <div className="mb-4">
        <Link href="/meetings" className="text-sm text-accent hover:underline">← Meetings</Link>
      </div>

      <LiveMeetingView
        meetingId={meeting.id}
        title={meeting.title}
        type={typeLabel}
        status={meeting.status}
        startDateTime={new Date(meeting.startDateTime).toISOString()}
        attendees={meeting.attendees}
        initialNotes={meeting.notes ?? ""}
        actions={meeting.actions ?? []}
        canEdit={canEdit}
        canAddActions={canAddActions}
        currentUserId={user.id}
      />
    </div>
  );
}
