import { Card } from "@/components/ui/card";

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-border/60" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 animate-pulse rounded bg-border/60" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-border/40" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center"><div className="mx-auto h-3.5 w-8 animate-pulse rounded bg-border/60" /></td>
      <td className="px-4 py-3 text-center"><div className="mx-auto h-3.5 w-10 animate-pulse rounded bg-border/60" /></td>
      <td className="px-4 py-3 text-center"><div className="mx-auto h-3.5 w-14 animate-pulse rounded bg-border/60" /></td>
      <td className="px-4 py-3 text-right"><div className="ml-auto h-3.5 w-10 animate-pulse rounded bg-border/60" /></td>
    </tr>
  );
}

export default function StudentsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="h-8 w-40 animate-pulse rounded bg-border/60" />
        <div className="h-4 w-64 animate-pulse rounded bg-border/40" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 min-w-[180px] flex-1 animate-pulse rounded-lg bg-border/40" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-border/40" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-border/40" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-border/40" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-border/40" />
          <div className="h-9 w-16 animate-pulse rounded-lg bg-border/60" />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium text-center">Year</th>
              <th className="px-4 py-3 font-medium text-center">Attendance</th>
              <th className="px-4 py-3 font-medium text-center">Last snapshot</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
