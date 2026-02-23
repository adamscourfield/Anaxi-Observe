import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const body = await req.json();
  const { to, subject, message } = body;

  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json({ status: "not_configured" }, { status: 202 });
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.FROM_EMAIL || "no-reply@anaxi.local" },
      subject,
      content: [{ type: "text/plain", value: message }]
    })
  });

  return NextResponse.json({ status: res.ok ? "sent" : "failed" }, { status: res.ok ? 200 : 502 });
}
