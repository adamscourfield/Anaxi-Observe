"use server";

import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMeeting(formData: FormData) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");
  requireRole(user, ["LEADER", "SLT", "ADMIN"]);

  const title = String(formData.get("title") || "").trim();
  const meetingType = String(formData.get("meetingType") || "OTHER");
  const startAt = new Date(String(formData.get("startAt") || ""));
  const endAtRaw = String(formData.get("endAt") || "").trim();
  const endAt = endAtRaw ? new Date(endAtRaw) : null;
  const attendeeIds = formData.getAll("attendeeIds").map((value) => String(value));

  if (!title || Number.isNaN(startAt.getTime())) throw new Error("INVALID_MEETING");
  if (endAt && Number.isNaN(endAt.getTime())) throw new Error("INVALID_MEETING");

  const attendees = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, id: { in: [...new Set([...attendeeIds, user.id])] }, isActive: true },
    select: { id: true }
  });

  const meeting = await (prisma as any).meeting.create({
    data: {
      tenantId: user.tenantId,
      title,
      meetingType,
      startAt,
      endAt,
      createdById: user.id,
      attendees: {
        createMany: { data: attendees.map((attendee: any) => ({ userId: attendee.id })) }
      }
    }
  });

  revalidatePath("/tenant/meetings");
  revalidatePath("/tenant/meetings/actions");
  redirect(`/tenant/meetings/${meeting.id}`);
}

export async function updateMeetingNotes(formData: FormData) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const meetingId = String(formData.get("meetingId") || "");
  const notes = String(formData.get("notes") || "").trim() || null;
  const meeting = await (prisma as any).meeting.findFirst({
    where: { id: meetingId, tenantId: user.tenantId },
    include: { attendees: true }
  });
  if (!meeting) throw new Error("NOT_FOUND");

  const isAttendee = (meeting.attendees as any[]).some((attendee) => attendee.userId === user.id);
  if (!isAttendee && meeting.createdById !== user.id) throw new Error("FORBIDDEN");

  await (prisma as any).meeting.update({ where: { id: meetingId }, data: { notes } });
  revalidatePath(`/tenant/meetings/${meetingId}`);
}

export async function addMeetingAction(formData: FormData) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const meetingId = String(formData.get("meetingId") || "");
  const actionText = String(formData.get("actionText") || "").trim();
  const assignedToId = String(formData.get("assignedToId") || "");
  const dueDate = new Date(String(formData.get("dueDate") || ""));

  if (!meetingId || !actionText || !assignedToId || Number.isNaN(dueDate.getTime())) throw new Error("INVALID_ACTION");

  const meeting = await (prisma as any).meeting.findFirst({
    where: { id: meetingId, tenantId: user.tenantId },
    include: { attendees: true }
  });
  if (!meeting) throw new Error("NOT_FOUND");

  const canEdit = meeting.createdById === user.id || (meeting.attendees as any[]).some((attendee) => attendee.userId === user.id);
  if (!canEdit) throw new Error("FORBIDDEN");

  const assignee = await (prisma as any).user.findFirst({ where: { id: assignedToId, tenantId: user.tenantId, isActive: true } });
  if (!assignee) throw new Error("INVALID_ASSIGNEE");

  await (prisma as any).meetingAction.create({
    data: {
      tenantId: user.tenantId,
      meetingId,
      actionText,
      assignedToId,
      dueDate,
      status: "OPEN"
    }
  });

  revalidatePath(`/tenant/meetings/${meetingId}`);
  revalidatePath("/tenant/meetings/actions");
}

export async function markActionDone(formData: FormData) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "MEETINGS");

  const actionId = String(formData.get("actionId") || "");
  const completionNote = String(formData.get("completionNote") || "").trim() || null;

  const action = await (prisma as any).meetingAction.findFirst({ where: { id: actionId, tenantId: user.tenantId } });
  if (!action) throw new Error("NOT_FOUND");
  if (action.assignedToId !== user.id) throw new Error("FORBIDDEN");

  await (prisma as any).meetingAction.update({
    where: { id: actionId },
    data: { status: "DONE", completedAt: new Date(), completionNote }
  });

  revalidatePath("/tenant/meetings/actions");
  revalidatePath(`/tenant/meetings/${action.meetingId}`);
}
