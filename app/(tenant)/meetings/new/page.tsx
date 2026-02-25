import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { MeetingForm } from "@/components/meetings/MeetingForm";
import { redirect } from "next/navigation";

export default async function NewMeetingPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");
  if (!hasPermission(user.role, "meetings:create")) redirect("/tenant/meetings");

  const users = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Meeting</h1>
      <MeetingForm users={users} currentUserId={user.id} />
    </div>
  );
}
