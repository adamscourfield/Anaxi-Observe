import { ACTION_STATUS_LABELS } from "@/modules/actions/types";
import { StatusPill, PillVariant } from "@/components/ui/status-pill";

type Status = "OPEN" | "DONE" | "BLOCKED";

const STATUS_VARIANT: Record<Status, PillVariant> = {
  OPEN: "info",
  BLOCKED: "warning",
  DONE: "success",
};

interface ActionStatusBadgeProps {
  status: Status;
}

export function ActionStatusBadge({ status }: ActionStatusBadgeProps) {
  return (
    <StatusPill variant={STATUS_VARIANT[status] ?? "neutral"} size="sm">
      {ACTION_STATUS_LABELS[status] ?? status}
    </StatusPill>
  );
}
