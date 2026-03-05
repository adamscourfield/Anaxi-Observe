import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");
  requireRole(user, ["TEACHER", "LEADER", "SLT", "ADMIN"]);

  const form = await req.formData();
  const studentId = String(form.get("studentId") || "");
  const category = String(form.get("category") || "BEHAVIOUR");
  const locationId = String(form.get("locationId") || "") || null;
  const locationText = String(form.get("locationText") || "") || null;
  const reasonId = String(form.get("reasonId") || "") || null;
  const notes = String(form.get("notes") || "") || null;

  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
  if (category === "BEHAVIOUR" && !reasonId) return NextResponse.json({ error: "reason required for behaviour" }, { status: 400 });

  const student = await (prisma as any).student.findFirst({ where: { id: studentId, tenantId: user.tenantId } });
  if (!student) return NextResponse.json({ error: "student not found" }, { status: 404 });

  const requestRow = await (prisma as any).onCallRequest.create({
    data: {
      tenantId: user.tenantId,
      createdById: user.id,
      studentId,
      category,
      locationId,
      locationText,
      reasonId,
      notes,
      status: "SENT"
    },
    include: { student: true, reason: true, location: true }
  });

  const recipients = await (prisma as any).user.findMany({
    where: { tenantId: user.tenantId, isActive: true, receivesOnCallEmails: true },
    select: { email: true }
  });
  const to = recipients.map((r: any) => ({ email: r.email }));

  let emailError: string | null = null;
  if (to.length && process.env.SENDGRID_API_KEY) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to }],
        from: { email: process.env.FROM_EMAIL || "no-reply@anaxi.local" },
        subject: `[On Call] ${requestRow.student.fullName} ${requestRow.category}`,
        content: [{
          type: "text/plain",
          value: [
            `Student: ${requestRow.student.fullName} (${requestRow.student.upn})`,
            `Year: ${requestRow.student.yearGroup || "-"}`,
            `Location: ${requestRow.location?.label || requestRow.locationText || "-"}`,
            `Category: ${requestRow.category}`,
            `Reason: ${requestRow.reason?.label || "-"}`,
            `Timestamp: ${new Date(requestRow.createdAt).toISOString()}`,
            `Link: ${process.env.NEXTAUTH_URL || "http://localhost:5000"}/on-call/${requestRow.id}`,
            `Notes: ${requestRow.notes || "-"}`
          ].join("\n")
        }]
      })
    });
    if (!res.ok) emailError = `send failed (${res.status})`;
  } else {
    emailError = to.length ? "SENDGRID_API_KEY missing" : "No active recipients configured";
  }

  const url = new URL(`/tenant/on-call/feed?created=${requestRow.id}${emailError ? `&emailError=${encodeURIComponent(emailError)}` : ""}`, req.url);
  return NextResponse.redirect(url);
}
