import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));

  // Always return success to avoid leaking whether an email is registered
  const genericOk = NextResponse.json({ ok: true });

  if (!email || typeof email !== "string") return genericOk;

  const users = await prisma.user.findMany({
    where: { email: email.toLowerCase().trim(), isActive: true },
    select: { id: true, fullName: true, email: true },
  });

  if (users.length === 0) return genericOk;

  // Use first matching active user (email may belong to multiple tenants)
  const user = users[0];

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/login/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your Anaxi password",
    message: [
      `Hi ${user.fullName},`,
      "",
      "You requested a password reset for your Anaxi account.",
      "",
      `Click the link below to set a new password (valid for ${TOKEN_EXPIRY_HOURS} hour):`,
      "",
      resetUrl,
      "",
      "If you did not request this, you can safely ignore this email.",
      "",
      "– The Anaxi Team",
    ].join("\n"),
  });

  return genericOk;
}
