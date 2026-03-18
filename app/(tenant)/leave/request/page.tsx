import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createLoaRequest } from "../actions";

export default async function LeaveRequestPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const reasons = await prisma.loaReason.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { label: "asc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl">
      {/* Header */}
      <div className="mb-7 flex items-center gap-3">
        <Link
          href="/leave"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted calm-transition hover:bg-white/60 hover:text-text"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-text">Request leave</h1>
          <p className="mt-0.5 text-[0.875rem] text-muted">Submit dates, reason, and cover notes for your approver.</p>
        </div>
      </div>

      <form action={createLoaRequest} className="space-y-5">
        {/* Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="loa-start" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
              Start date
            </label>
            <input
              id="loa-start"
              required
              type="date"
              name="startAt"
              defaultValue={today}
              className="field"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="loa-end" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
              End date
            </label>
            <input
              id="loa-end"
              required
              type="date"
              name="endAt"
              defaultValue={today}
              className="field"
            />
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label htmlFor="loa-reason" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Reason
          </label>
          <select id="loa-reason" required name="reasonId" className="field">
            <option value="">Select a reason…</option>
            {reasons.map((reason: any) => (
              <option key={reason.id} value={reason.id}>{reason.label}</option>
            ))}
          </select>
        </div>

        {/* Cover notes */}
        <div className="space-y-2">
          <label htmlFor="loa-cover-notes" className="block text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-muted">
            Cover notes <span className="font-normal normal-case tracking-normal text-muted">· optional</span>
          </label>
          <textarea
            id="loa-cover-notes"
            name="coverNotes"
            className="field min-h-[100px] resize-y"
            placeholder="Any information your cover or approver needs to know…"
            rows={4}
          />
        </div>

        {/* Submit */}
        <div className="space-y-3 pt-1">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[0.9375rem] font-semibold text-white shadow-sm calm-transition hover:bg-accentHover"
          >
            Submit request
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-center text-[0.75rem] text-muted">
            Your request will be sent to your approver and marked as pending.
          </p>
        </div>
      </form>
    </div>
  );
}
