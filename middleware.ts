import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-insecure-nextauth-secret"
});

export const config = {
  matcher: ["/tenant/:path*", "/api/students/:path*", "/api/on-call/:path*", "/api/email/:path*", "/api/csv/:path*"]
};
