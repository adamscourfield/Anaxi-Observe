import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function localDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function LeaveCalendarPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const manager = await canManageLoa(user);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const requests = await (prisma as any).lOARequest.findMany({
    where: {
      tenantId: user.tenantId,
      ...(manager ? {} : { requesterId: user.id }),
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: { requester: true, reason: true },
    orderBy: { startDate: "asc" },
  });

  const daysInMonth = end.getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(start.getFullYear(), start.getMonth(), i + 1));

  // ISO week: Monday = 0
  const firstDayOfWeek = (start.getDay() + 6) % 7;
  const todayKey = localDayKey(new Date());

  const monthLabel = start.toLocaleString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Leave calendar — ${monthLabel}`}
        subtitle={manager ? "School-wide pending and approved leave." : "Your pending and approved leave requests."}
        actions={
          <Link
            href="/leave/request"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-primary shadow-sm calm-transition hover:bg-accentHover"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New request
          </Link>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-scale-some-bar" />
          Pending approval
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-scale-strong-bg0" />
          Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          Today
        </span>
      </div>

      {/* Calendar card */}
      <div className="overflow-hidden rounded-2xl glass-card shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/30 bg-surface-container-lowest/50">
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.07em] ${
                i >= 5 ? "text-outline" : "text-muted"
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`pad-${i}`}
              className="min-h-[110px] border-b border-r border-border/20 bg-surface-container-low/30"
            />
          ))}

          {days.map((day) => {
            const key = localDayKey(day);
            const isToday = key === todayKey;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
            const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

            const entries = (requests as any[]).filter((r) => {
              const rStart = new Date(r.startDate);
              const rEnd = new Date(r.endDate);
              return rStart <= dayEnd && rEnd >= dayStart;
            });

            return (
              <div
                key={key}
                className={`group relative min-h-[110px] border-b border-r border-border/20 p-2 transition-colors duration-150 ${
                  isToday
                    ? "bg-accent/[0.04]"
                    : isWeekend
                    ? "bg-surface-container-low/60"
                    : "bg-transparent hover:bg-surface-container-lowest/40"
                }`}
              >
                {/* Date number + request button */}
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-semibold ${
                      isToday
                        ? "bg-accent text-on-primary"
                        : isWeekend
                        ? "text-outline"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {!isWeekend && (
                    <Link
                      href={`/leave/request?date=${key}`}
                      className="hidden h-[18px] w-[18px] items-center justify-center rounded-full bg-accent/10 text-accent text-[15px] leading-none calm-transition group-hover:flex hover:bg-accent hover:text-on-primary"
                      title={`Request leave for ${day.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                    >
                      +
                    </Link>
                  )}
                </div>

                {/* Leave entries */}
                <div className="flex flex-col gap-0.5">
                  {entries.map((request) => (
                    <Link
                      key={request.id}
                      href={`/leave/${request.id}?from=calendar`}
                      className={`block truncate rounded px-1.5 py-[3px] text-[11px] font-medium leading-snug calm-transition ${
                        request.status === "APPROVED"
                          ? "bg-scale-strong-light text-scale-strong-text hover:bg-scale-strong-bg"
                          : "bg-scale-some-light text-scale-some-text hover:bg-scale-some-bg"
                      }`}
                    >
                      {manager
                        ? request.requester?.fullName?.split(" ")[0] ?? "Staff"
                        : request.reason?.label ?? "Leave"}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Trailing empty cells */}
          {Array.from({
            length: (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7,
          }).map((_, i) => (
            <div
              key={`trail-${i}`}
              className="min-h-[110px] border-b border-r border-border/20 bg-surface-container-low/30"
            />
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/leave"
          className="rounded-lg border border-border/60 bg-surface-container-lowest/70 px-3.5 py-2 text-sm font-medium text-muted backdrop-blur-sm calm-transition hover:border-accent/30 hover:text-accent"
        >
          ← All requests
        </Link>
        {manager && (
          <Link
            href="/leave/pending"
            className="rounded-lg border border-border/60 bg-surface-container-lowest/70 px-3.5 py-2 text-sm font-medium text-muted backdrop-blur-sm calm-transition hover:border-accent/30 hover:text-accent"
          >
            Pending approvals
          </Link>
        )}
      </div>
    </div>
  );
}
