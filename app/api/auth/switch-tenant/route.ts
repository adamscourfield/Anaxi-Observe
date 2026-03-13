import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const currentUser = (session as any)?.user;
  if (!currentUser?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const formData = await req.formData();
  const targetTenantId = formData.get("tenantId") as string;
  if (!targetTenantId) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  const targetUser = await prisma.user.findFirst({
    where: { email: currentUser.email, tenantId: targetTenantId, isActive: true },
  });

  if (!targetUser) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("switchTo", targetTenantId);
  loginUrl.searchParams.set("email", currentUser.email);

  const signoutUrl = new URL("/api/auth/signout", req.url);
  signoutUrl.searchParams.set("callbackUrl", loginUrl.toString());

  return NextResponse.redirect(signoutUrl);
}
