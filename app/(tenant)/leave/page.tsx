import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";

function fmt(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

const STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
  PENDING:  { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DENIED:   { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default async function LeavePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const manager = await canManageLoa(user);
  const created = String(searchParams?.created || "") === "1";

  const requests = await (prisma as any).lOARequest.findMany({
    where: manager
      ? { tenantId: user.tenantId }
      : { tenantId: user.tenantId, requesterId: user.id },
    include: { reason: true, requester: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const pendingRequests = (requests as any[]).filter((r) => r.status === "PENDING");
  const recentRequests = (requests as any[]).filter((r) => r.status !== "PENDING").slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-text">Leave of absence</h1>
          <p className="mt-1 text-[0.9375rem] text-muted">
            Track requests, check status, and manage cover arrangements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/leave/request"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.875rem] font-semibold text-white shadow-sm calm-transition hover:bg-accentHover"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Request leave
          </Link>
          <Link
            href="/leave/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-white/70 px-4 py-2.5 text-[0.875rem] font-medium text-muted backdrop-blur-sm calm-transition hover:border-accent/30 hover:text-accent"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
              <rect x="3.5" y="4.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 2.8v3.4M13.5 2.8v3.4M3.5 8.2h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Calendar
          </Link>
          {manager && (
            <Link
              href="/leave/pending"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[0.875rem] font-medium text-amber-700 calm-transition hover:bg-amber-100"
            >
              Pending approvals
              {pendingRequests.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">
                  {pendingRequests.filter((r) => manager && r.requesterId !== user.id).length || pendingRequests.length}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* Success banner */}
      {created && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-[0.875rem] text-emerald-800">
            Leave request submitted — you can track its status below.
          </p>
        </div>
      )}

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="mb-3 text-[0.875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Awaiting decision · {pendingRequests.length}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/40 backdrop-blur-sm">
            {pendingRequests.map((request: any, idx: number) => {
              const start = new Date(request.startDate);
              const end = new Date(request.endDate);
              const days = businessDays(start, end);
              const isLast = idx === pendingRequests.length - 1;
              return (
                <Link
                  key={request.id}
                  href={`/leave/${request.id}`}
                  className={`group flex items-center gap-4 px-5 py-4 calm-transition hover:bg-amber-50/60 ${!isLast ? "border-b border-amber-200/40" : ""}`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <div className="min-w-0 flex-1">
                    {manager && request.requester && (
                      <p className="text-[0.8125rem] font-semibold text-text">{request.requester.fullName}</p>
                    )}
                    <p className="text-[0.875rem] font-medium text-amber-800">
                      {fmt(start)} — {fmt(end)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[0.75rem] text-amber-700/80">
                      {request.reason?.label && <span>{request.reason.label}</span>}
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium">
                        {days} day{days !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[0.75rem] font-semibold text-amber-700">
                    Pending
                  </span>
                  <svg className="h-4 w-4 shrink-0 text-amber-400 calm-transition group-hover:text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent requests */}
      <div>
        <h2 className="mb-3 text-[0.875rem] font-semibold uppercase tracking-[0.07em] text-muted">
          {pendingRequests.length > 0 ? "Past requests" : "All requests"}
        </h2>

        {recentRequests.length === 0 && pendingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[0.875rem] font-semibold text-text">No leave requests yet</p>
            <p className="mt-1 text-[0.8125rem] text-muted">Submitted requests will appear here with approval status.</p>
            <Link
              href="/leave/request"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[0.875rem] font-semibold text-white calm-transition hover:bg-accentHover"
            >
              Submit first request
            </Link>
          </div>
        ) : recentRequests.length === 0 ? null : (
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm">
            {recentRequests.map((request: any, idx: number) => {
              const start = new Date(request.startDate);
              const end = new Date(request.endDate);
              const days = businessDays(start, end);
              const style = STATUS_STYLES[request.status] ?? STATUS_STYLES.PENDING;
              const isLast = idx === recentRequests.length - 1;
              return (
                <Link
                  key={request.id}
                  href={`/leave/${request.id}`}
                  className={`group flex items-center gap-4 px-5 py-3.5 calm-transition hover:bg-white/50 ${!isLast ? "border-b border-border/20" : ""}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    {manager && request.requester && (
                      <p className="text-[0.8125rem] font-semibold text-text">{request.requester.fullName}</p>
                    )}
                    <p className={`text-[0.875rem] font-medium ${manager && request.requester ? "text-muted" : "text-text"}`}>
                      {fmt(start)} — {fmt(end)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[0.75rem] text-muted">
                      {request.reason?.label && <span>{request.reason.label}</span>}
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {days} day{days !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.75rem] font-semibold ${style.badge}`}>
                    {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
                  </span>
                  <svg className="h-3.5 w-3.5 shrink-0 text-border calm-transition group-hover:text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
