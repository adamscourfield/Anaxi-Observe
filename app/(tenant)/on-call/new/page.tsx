import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { OnCallRequestForm } from "@/components/oncall/OnCallRequestForm";
import { H1 } from "@/components/ui/typography";

export default async function OnCallNewPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const students = await (prisma as any).student.findMany({
    where: { tenantId: user.tenantId, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    take: 500,
    select: { id: true, fullName: true, upn: true, yearGroup: true },
  });

  return (
    <div className="space-y-5">
      <H1>New On Call Request</H1>
      <p className="text-sm text-muted">Designed for fast submission — under 15 seconds.</p>
      <OnCallRequestForm students={students} />
    </div>
  );
}
