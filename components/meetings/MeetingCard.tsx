import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { MetaText } from "@/components/ui/typography";
import { MEETING_TYPE_LABELS } from "@/modules/meetings/types";

interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    type: string;
    startDateTime: string | Date;
    endDateTime: string | Date;
    location?: string | null;
    createdBy: { fullName: string };
    attendees: Array<{ id: string }>;
    _count?: { actions: number };
  };
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const start = new Date(meeting.startDateTime);
  const typeLabel = MEETING_TYPE_LABELS[meeting.type] ?? meeting.type;

  return (
    <Card tone="interactive">
      <Link href={`/meetings/${meeting.id}`} className="block space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-text">{meeting.title}</p>
          <StatusPill variant="neutral" size="sm">{typeLabel}</StatusPill>
        </div>
        <MetaText>
          {start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          {" \u00b7 "}
          {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          {meeting.location ? ` \u00b7 ${meeting.location}` : ""}
        </MetaText>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}</span>
          {meeting._count?.actions !== undefined && (
            <span>{meeting._count.actions} action{meeting._count.actions !== 1 ? "s" : ""}</span>
          )}
          <span>by {meeting.createdBy.fullName}</span>
        </div>
      </Link>
    </Card>
  );
}
