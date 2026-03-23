import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { LeaveTable, type LeaveRow } from "./LeaveTable";

/* ── Helpers ────────────────────────────────────────────────────── */

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

function localDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AVATAR_COLORS = [
  "bg-cat-violet-bg text-cat-violet-text",
  "bg-cat-blue-bg text-cat-blue-text",
  "bg-scale-strong-light text-scale-strong-text",
  "bg-scale-limited-light text-scale-limited-text",
  "bg-scale-some-light text-scale-some-text",
  "bg-cat-indigo-bg text-cat-indigo-text",
];

function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/* ── Page ───────────────────────────────────────────────────────── */

export default async function LeavePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const manager = await canManageLoa(user);
  const created = String(searchParams?.created || "") === "1";

  const view = String(searchParams?.view || "list");
  const monthParam = String(searchParams?.month || "");

  /* Calendar month */
  let calendarDate = new Date();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    calendarDate = new Date(y, m - 1, 1);
  }

  /* Fetch requests */
  const requests = await (prisma as any).lOARequest.findMany({
    where: manager
      ? { tenantId: user.tenantId }
      : { tenantId: user.tenantId, requesterId: user.id },
    include: { reason: true, requester: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  /* Stats */
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const totalPending = (requests as any[]).filter((r) => r.status === "PENDING").length;

  const approvedThisMonth = (requests as any[]).filter(
    (r) =>
      r.status === "APPROVED" &&
      new Date(r.updatedAt) >= monthStart &&
      new Date(r.updatedAt) <= monthEnd,
  ).length;

  const deniedThisMonth = (requests as any[]).filter(
    (r) =>
      r.status === "DENIED" &&
      new Date(r.updatedAt) >= monthStart &&
      new Date(r.updatedAt) <= monthEnd,
  ).length;

  const resolved = (requests as any[]).filter(
    (r) => r.status !== "PENDING" && r.updatedAt && r.createdAt,
  );
  const avgDays =
    resolved.length > 0
      ? resolved.reduce((sum, r) => {
          const diff = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / resolved.length
      : null;
  const avgResponseStr = avgDays !== null ? `${avgDays.toFixed(1)}d` : "—";

  /* Table rows */
  const tableRows: LeaveRow[] = (requests as any[]).slice(0, 50).map((r) => {
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    const name = r.requester?.fullName ?? null;
    return {
      id: r.id,
      startDate: fmt(start),
      endDate: fmt(end),
      days: businessDays(start, end),
      status: r.status as "PENDING" | "APPROVED" | "DENIED",
      reasonLabel: r.reason?.label ?? null,
      requesterName: name,
      requesterInitials: name ? initials(name) : null,
      requesterAvatarColor: name ? avatarColor(name) : null,
    };
  });

  /* Calendar data */
  const calStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const calEnd = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0,
    23,
    59,
    59,
  );
  const calendarRequests = (requests as any[]).filter((r) => {
    if (r.status === "DENIED") return false;
    const rStart = new Date(r.startDate);
    const rEnd = new Date(r.endDate);
    return rStart <= calEnd && rEnd >= calStart;
  });

  const daysInMonth = calEnd.getDate();
  const calDays = Array.from(
    { length: daysInMonth },
    (_, i) => new Date(calStart.getFullYear(), calStart.getMonth(), i + 1),
  );
  const firstDayOfWeek = calStart.getDay(); // 0 = Sunday
  const todayKey = localDayKey(new Date());
  const monthLabel = calStart.toLocaleString("en-GB", { month: "long", year: "numeric" });

  const prevMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  const nextMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  const prevMonthParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  const isCalendar = view === "calendar";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[1.5rem] font-bold tracking-tight text-text">Leave of Absence</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* List / Calendar toggle */}
          <div className="flex items-center rounded-xl border border-border/60 bg-surface-container-lowest/70 p-1 backdrop-blur-sm">
            <Link
              href="/leave?view=list"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium calm-transition ${
                !isCalendar
                  ? "bg-surface-container-low text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                  strokeLinecap="round"
                />
              </svg>
              List View
            </Link>
            <Link
              href="/leave?view=calendar"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium calm-transition ${
                isCalendar
                  ? "bg-surface-container-low text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                <rect
                  x="3.5"
                  y="4.5"
                  width="13"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M6.5 2.8v3.4M13.5 2.8v3.4M3.5 8.2h13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Calendar
            </Link>
          </div>

          {/* Request Leave button */}
          <Link
            href="/leave/request"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.875rem] font-semibold text-on-primary shadow-sm calm-transition hover:bg-accentHover"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Request Leave
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Pending" value={totalPending} />
        <StatCard label="Approved (Month)" value={approvedThisMonth} accent="success" />
        <StatCard label="Denied (Month)" value={deniedThisMonth} accent="error" />
        <StatCard label="Average Response" value={avgResponseStr} accent="warning" />
      </div>

      {/* Success banner */}
      {created && (
        <div className="flex items-center gap-3 rounded-xl border border-status-approved-border bg-status-approved-bg px-4 py-3">
          <svg
            className="h-4 w-4 shrink-0 text-scale-strong-text"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-[0.875rem] text-scale-strong-text">
            Leave request submitted — you can track its status below.
          </p>
        </div>
      )}

      {isCalendar ? (
        /* ── Calendar View ─────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Calendar toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href={`/leave?view=calendar&month=${prevMonthParam}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted calm-transition hover:border-accent/30 hover:text-accent"
                aria-label="Previous month"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <h2 className="min-w-[11rem] text-center text-[1rem] font-semibold text-text capitalize">
                {monthLabel}
              </h2>
              <Link
                href={`/leave?view=calendar&month=${nextMonthParam}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted calm-transition hover:border-accent/30 hover:text-accent"
                aria-label="Next month"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 text-[0.75rem] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-scale-some-bar" />
                Pending
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-scale-strong-bar" />
                Approved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-scale-limited-bar" />
                Declined
              </span>
            </div>
          </div>

          {/* Calendar card */}
          <div className="overflow-hidden rounded-2xl glass-card shadow-sm">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-border/30 bg-surface-container-lowest/50">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.07em] ${
                    i === 0 || i === 6 ? "text-outline" : "text-muted"
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
                  className="min-h-[100px] border-b border-r border-border/20 bg-surface-container-low/30"
                />
              ))}

              {calDays.map((day) => {
                const key = localDayKey(day);
                const isToday = key === todayKey;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const dayStart = new Date(
                  day.getFullYear(),
                  day.getMonth(),
                  day.getDate(),
                  0,
                  0,
                  0,
                );
                const dayEnd = new Date(
                  day.getFullYear(),
                  day.getMonth(),
                  day.getDate(),
                  23,
                  59,
                  59,
                );

                const entries = calendarRequests.filter((r: any) => {
                  const rStart = new Date(r.startDate);
                  const rEnd = new Date(r.endDate);
                  return rStart <= dayEnd && rEnd >= dayStart;
                });

                return (
                  <div
                    key={key}
                    className={`group relative min-h-[100px] border-b border-r border-border/20 p-2 transition-colors duration-150 ${
                      isToday
                        ? "bg-accent/[0.04]"
                        : isWeekend
                          ? "bg-surface-container-low/60"
                          : "bg-transparent hover:bg-surface-container-lowest/40"
                    }`}
                  >
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

                    <div className="flex flex-col gap-0.5">
                      {entries.map((request: any) => (
                        <Link
                          key={request.id}
                          href={`/leave/${request.id}`}
                          className={`block truncate rounded px-1.5 py-[3px] text-[11px] font-medium leading-snug calm-transition ${
                            request.status === "APPROVED"
                              ? "bg-scale-strong-light text-scale-strong-text hover:bg-scale-strong-bg"
                              : "bg-scale-some-light text-scale-some-text hover:bg-scale-some-bg"
                          }`}
                        >
                          {manager
                            ? (request.requester?.fullName?.split(" ")[0] ?? "Staff")
                            : (request.reason?.label ?? "Leave")}
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
                  className="min-h-[100px] border-b border-r border-border/20 bg-surface-container-low/30"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── List View ─────────────────────────────────────────────── */
        tableRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <svg
                className="h-6 w-6 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[0.875rem] font-semibold text-text">No leave requests yet</p>
            <p className="mt-1 text-[0.8125rem] text-muted">
              Submitted requests will appear here with approval status.
            </p>
            <Link
              href="/leave/request"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[0.875rem] font-semibold text-on-primary calm-transition hover:bg-accentHover"
            >
              Submit first request
            </Link>
          </div>
        ) : (
          <LeaveTable rows={tableRows} isManager={manager} />
        )
      )}
    </div>
  );
}
