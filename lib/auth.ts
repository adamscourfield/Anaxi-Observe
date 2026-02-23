import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/types";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dev-insecure-nextauth-secret",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findFirst({ where: { email, isActive: true } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          name: user.fullName
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user = token.user;
      return session;
    }
  }
};

export async function getSessionUserOrThrow(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = (session as any)?.user as SessionUser | undefined;
  if (!user?.id || !user?.tenantId) throw new Error("UNAUTHENTICATED");
  return user;
}

export function assertTenantRecord(recordTenantId: string, userTenantId: string) {
  if (recordTenantId !== userTenantId) throw new Error("FORBIDDEN");
}
