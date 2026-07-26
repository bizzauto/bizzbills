import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

const publicPaths = ["/auth/signin", "/auth/register", "/api/auth"];

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ token, req }) {
      const { pathname } = req.nextUrl;

      if (publicPaths.some((p) => pathname.startsWith(p))) return true;

      if (pathname === "/" || pathname === "") return true;

      return !!token?.id;
    },
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/billing/:path*",
    "/invoices/:path*",
    "/settings/:path*",
    "/accounting/:path*",
    "/inventory/:path*",
    "/crm/:path*",
    "/orders/:path*",
    "/reports/:path*",
    "/admin/:path*",
    "/organization/:path*",
  ],
};
