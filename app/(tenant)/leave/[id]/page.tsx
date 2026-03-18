import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { decideLoaRequest } from "../actions";

function fmt(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function businessDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const fin = new Date(end);
  fin.setHours(0, 0, 0, 0);
  while (cur <= fin) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  PENDING: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Pending approval",
    icon: (
      <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    ),
  },
  APPROVED: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Approved",
    icon: (
      <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  DENIED: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    label: "Denied",
    icon: (
      <svg className="h-4 w-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
};

export default async function LeaveDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");

  const request = await (prisma as any).lOARequest.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { requester: true, reason: true },
  });
  if (!request) notFound();

  const manager = request.requesterId !== user.id && (await canManageLoa(user, request.requesterId));
  if (!manager && request.requesterId !== user.id) throw new Error("FORBIDDEN");

  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const days = businessDays(startDate, endDate);
  const status = request.status as string;
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Back */}
      <Link
        href="/leave"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted calm-transition hover:text-text"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Leave requests
      </Link>

      {/* Hero card */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
        <div className="px-6 py-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">Leave request</p>
              <p className="mt-1 text-[1.125rem] font-bold text-text">{request.requester?.fullName ?? "Staff member"}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.8125rem] font-semibold ${statusStyle.badge}`}>
              {statusStyle.icon}
              {statusStyle.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/30 bg-white/50 p-4">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">Start</p>
              <p className="mt-1 text-[0.9375rem] font-semibold text-text">{fmt(startDate)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">End</p>
              <p className="mt-1 text-[0.9375rem] font-semibold text-text">{fmt(endDate)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">Duration</p>
              <p className="mt-1 text-[0.9375rem] font-semibold text-text">{days} school day{days !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">Reason</p>
              <p className="mt-1 text-[0.9375rem] font-semibold text-text">{request.reason?.label ?? "—"}</p>
            </div>
          </div>

          {request.notes && (
            <div className="mt-4 rounded-xl border border-border/30 bg-white/40 px-4 py-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">Notes</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-text">{request.notes}</p>
            </div>
          )}

          <p className="mt-4 text-[0.75rem] text-muted">
            Submitted {new Date(request.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Decision form — manager + pending only */}
      {manager && status === "PENDING" && (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
          <div className="border-b border-border/30 px-6 py-4">
            <h2 className="text-[0.9375rem] font-semibold text-text">Make a decision</h2>
            <p className="mt-0.5 text-[0.8125rem] text-muted">Your decision will be recorded with a timestamp.</p>
          </div>
          <form action={decideLoaRequest} className="space-y-4 px-6 py-5">
            <input type="hidden" name="requestId" value={request.id} />

            {/* Decision buttons */}
            <div className="grid grid-cols-2 gap-3">
              {(["APPROVED", "DENIED"] as const).map((val) => (
                <label
                  key={val}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5 calm-transition has-[:checked]:ring-1 ${
                    val === "APPROVED"
                      ? "border-emerald-200 bg-emerald-50/60 has-[:checked]:border-emerald-500 has-[:checked]:ring-emerald-300/50"
                      : "border-rose-200 bg-rose-50/60 has-[:checked]:border-rose-500 has-[:checked]:ring-rose-300/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="decisionType"
                    value={val}
                    defaultChecked={val === "APPROVED"}
                    className="sr-only"
                  />
                  {val === "APPROVED" ? (
                    <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                  <span className={`text-[0.875rem] font-semibold ${val === "APPROVED" ? "text-emerald-700" : "text-rose-700"}`}>
                    {val === "APPROVED" ? "Approve" : "Deny"}
                  </span>
                </label>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="decision-notes" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
                Decision notes <span className="font-normal normal-case tracking-normal">· optional</span>
              </label>
              <textarea
                id="decision-notes"
                name="decisionNotes"
                rows={3}
                className="field min-h-[80px] resize-y"
                placeholder="Any notes for the requester…"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[0.9375rem] font-semibold text-white shadow-sm calm-transition hover:bg-accentHover"
            >
              Save decision
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
