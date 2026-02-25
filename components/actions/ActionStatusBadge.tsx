import { ACTION_STATUS_LABELS } from "@/modules/actions/types";

type Status = "OPEN" | "DONE" | "BLOCKED";

const STATUS_CLASSES: Record<Status, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  BLOCKED: "bg-yellow-100 text-yellow-800",
  DONE: "bg-green-100 text-green-800",
};

interface ActionStatusBadgeProps {
  status: Status;
}

export function ActionStatusBadge({ status }: ActionStatusBadgeProps) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status] ?? ""}`}>
      {ACTION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
