import { NextResponse } from "next/server";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const body = await req.json();
  const { to, subject, message } = body;

  const result = await sendEmail({ to, subject, message });

  if (result.status === "not_configured") {
    return NextResponse.json({ status: "not_configured" }, { status: 202 });
  }

  return NextResponse.json(
    { status: result.status },
    { status: result.status === "sent" ? 200 : 502 }
  );
}
