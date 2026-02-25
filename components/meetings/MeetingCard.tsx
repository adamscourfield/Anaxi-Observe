import Link from "next/link";
import { Card } from "@/components/ui/card";
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
    <Card className="hover:shadow-md calm-transition">
      <Link href={`/tenant/meetings/${meeting.id}`} className="block space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-text">{meeting.title}</p>
          <span className="shrink-0 rounded-full bg-divider px-2 py-0.5 text-xs text-text">{typeLabel}</span>
        </div>
        <p className="text-sm text-text opacity-70">
          {start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          {" · "}
          {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          {meeting.location ? ` · ${meeting.location}` : ""}
        </p>
        <div className="flex items-center gap-3 text-xs opacity-60">
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
