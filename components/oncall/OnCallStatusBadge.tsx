import { STATUS_LABELS } from "@/modules/oncall/types";

type OnCallStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "CANCELLED";

const statusClasses: Record<OnCallStatus, string> = {
  OPEN: "bg-error/10 text-error border border-error/30",
  ACKNOWLEDGED: "bg-warning/10 text-warning border border-warning/30",
  RESOLVED: "bg-success/10 text-success border border-success/30",
  CANCELLED: "bg-divider text-muted border border-border",
};

export function OnCallStatusBadge({ status }: { status: OnCallStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusClasses[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
