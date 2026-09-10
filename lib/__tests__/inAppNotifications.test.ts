import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inAppNotification: {
      create: vi.fn().mockResolvedValue({ id: "n1" }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { createInAppNotification, countUnreadNotifications, notifyLeaveReviewers } from "@/lib/inAppNotifications";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inAppNotifications", () => {
  it("creates a notification", async () => {
    const row = await createInAppNotification({
      tenantId: "t1",
      userId: "u1",
      type: "test",
      title: "Hello",
      body: "World",
      href: "/home",
    });
    expect(row).toEqual({ id: "n1" });
    expect(prisma.inAppNotification.create).toHaveBeenCalled();
  });

  it("counts unread notifications", async () => {
    const count = await countUnreadNotifications("u1");
    expect(count).toBe(0);
  });
});

describe("notifyLeaveReviewers", () => {
  it("skips approvers who have leave emails disabled", async () => {
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.id === "approver_off"
          ? { isActive: true, emailObservations: true, emailMeetings: true, emailLeave: false, receivesOnCallEmails: true, receivesFirstAidEmails: true }
          : { isActive: true, emailObservations: true, emailMeetings: true, emailLeave: true, receivesOnCallEmails: true, receivesFirstAidEmails: true }
      )
    );

    await notifyLeaveReviewers({
      tenantId: "t1",
      approverUserIds: ["approver_on", "approver_off"],
      requesterName: "Alice",
      leaveRequestId: "req_1",
    });

    expect(prisma.inAppNotification.create).toHaveBeenCalledTimes(1);
    expect(prisma.inAppNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "approver_on" }) })
    );
  });

  it("skips inactive approvers", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ isActive: false });
    await notifyLeaveReviewers({
      tenantId: "t1",
      approverUserIds: ["inactive_user"],
      requesterName: "Alice",
      leaveRequestId: "req_1",
    });
    expect(prisma.inAppNotification.create).not.toHaveBeenCalled();
  });
});
