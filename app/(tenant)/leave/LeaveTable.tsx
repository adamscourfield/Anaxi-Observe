"use client";

import { useRouter } from "next/navigation";

export type LeaveRow = {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "PENDING" | "APPROVED" | "DENIED";
  reasonLabel: string | null;
  requesterName: string | null;
  requesterInitials: string | null;
  requesterAvatarColor: string | null;
};

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  PENDING:  { badge: "bg-scale-some-bg text-scale-some-text border-scale-some-border",            label: "Pending" },
  APPROVED: { badge: "bg-scale-strong-bg text-scale-strong-text border-status-approved-border",   label: "Approved" },
  DENIED:   { badge: "bg-status-denied-bg text-status-denied-text border-status-denied-border",   label: "Denied" },
};

export function LeaveTable({
  rows,
  isManager,
}: {
  rows: LeaveRow[];
  isManager: boolean;
}) {
  const router = useRouter();

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head-row text-left">
              {isManager && <th className="px-5 py-3.5">Employee</th>}
              <th className="px-5 py-3.5">Leave Type</th>
              <th className="px-4 py-3.5">Start Date</th>
              <th className="px-4 py-3.5">End Date</th>
              <th className="px-4 py-3.5 text-center">Days</th>
              <th className="px-4 py-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const style = STATUS_STYLES[row.status] ?? STATUS_STYLES.PENDING;
              return (
                <tr
                  key={row.id}
                  className="table-row calm-transition cursor-pointer"
                  onClick={() => router.push(`/leave/${row.id}`)}
                >
                  {isManager && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        {row.requesterAvatarColor && (
                          <div
                            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:flex ${row.requesterAvatarColor}`}
                          >
                            {row.requesterInitials}
                          </div>
                        )}
                        <span className="font-medium text-text">{row.requesterName ?? "—"}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <span className="text-text">{row.reasonLabel ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-muted">{row.startDate}</td>
                  <td className="px-4 py-4 text-muted">{row.endDate}</td>
                  <td className="px-4 py-4 text-center tabular-nums font-semibold text-text">
                    {row.days}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
          {rows.length} request{rows.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
