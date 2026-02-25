import { prisma } from "@/lib/prisma";
import { OnCallRequestInput, AcknowledgeOnCallInput, ResolveOnCallInput } from "./types";

const REQUEST_INCLUDE = {
  requester: { select: { id: true, fullName: true, email: true } },
  student: { select: { id: true, fullName: true, upn: true, yearGroup: true } },
  responder: { select: { id: true, fullName: true } },
};

export async function createOnCallRequest(
  tenantId: string,
  requesterUserId: string,
  input: OnCallRequestInput
) {
  if (!input.studentId) throw new Error("studentId required");
  if (!input.location) throw new Error("location required");
  if (input.requestType === "BEHAVIOUR" && !input.behaviourReasonCategory) {
    throw new Error("behaviourReasonCategory required for BEHAVIOUR type");
  }

  const student = await (prisma as any).student.findFirst({
    where: { id: input.studentId, tenantId },
  });
  if (!student) throw new Error("student not found");

  return (prisma as any).onCallRequest.create({
    data: {
      tenantId,
      requesterUserId,
      studentId: input.studentId,
      requestType: input.requestType,
      location: input.location,
      behaviourReasonCategory: input.behaviourReasonCategory ?? null,
      notes: input.notes ?? null,
      status: "OPEN",
    },
    include: REQUEST_INCLUDE,
  });
}

export async function acknowledgeOnCallRequest(
  requestId: string,
  tenantId: string,
  responderId: string,
  _input: AcknowledgeOnCallInput = {}
) {
  const existing = await (prisma as any).onCallRequest.findFirst({
    where: { id: requestId, tenantId },
  });
  if (!existing) throw new Error("request not found");
  if (existing.status !== "OPEN") throw new Error("request is not OPEN");

  return (prisma as any).onCallRequest.update({
    where: { id: requestId },
    data: {
      status: "ACKNOWLEDGED",
      responderUserId: responderId,
      acknowledgedAt: new Date(),
    },
    include: REQUEST_INCLUDE,
  });
}

export async function resolveOnCallRequest(
  requestId: string,
  tenantId: string,
  responderId: string,
  _input: ResolveOnCallInput = {}
) {
  const existing = await (prisma as any).onCallRequest.findFirst({
    where: { id: requestId, tenantId },
  });
  if (!existing) throw new Error("request not found");
  if (existing.status === "RESOLVED") throw new Error("request already resolved");
  if (existing.status === "CANCELLED") throw new Error("request is cancelled");

  return (prisma as any).onCallRequest.update({
    where: { id: requestId },
    data: {
      status: "RESOLVED",
      responderUserId: existing.responderUserId ?? responderId,
      resolvedAt: new Date(),
    },
    include: REQUEST_INCLUDE,
  });
}

export async function cancelOnCallRequest(
  requestId: string,
  tenantId: string,
  userId: string
) {
  const existing = await (prisma as any).onCallRequest.findFirst({
    where: { id: requestId, tenantId },
  });
  if (!existing) throw new Error("request not found");
  if (existing.status !== "OPEN") throw new Error("only OPEN requests can be cancelled");
  if (existing.requesterUserId !== userId) throw new Error("only the requester can cancel");

  return (prisma as any).onCallRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
    include: REQUEST_INCLUDE,
  });
}

export async function getOpenRequests(tenantId: string) {
  return (prisma as any).onCallRequest.findMany({
    where: { tenantId, status: "OPEN" },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function getRequestsByStatus(
  tenantId: string,
  status?: string,
  take = 50,
  skip = 0
) {
  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    (prisma as any).onCallRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    (prisma as any).onCallRequest.count({ where }),
  ]);

  return { data, total };
}

export async function getRequestDetail(tenantId: string, requestId: string) {
  const request = await (prisma as any).onCallRequest.findFirst({
    where: { id: requestId, tenantId },
    include: REQUEST_INCLUDE,
  });
  if (!request) throw new Error("request not found");
  return request;
}

export async function getResponderInbox(tenantId: string, responderId: string) {
  return (prisma as any).onCallRequest.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}
