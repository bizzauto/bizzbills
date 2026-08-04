import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const publicPaths = ["/auth/signin", "/auth/register", "/api/auth", "/api/setup", "/api/seed-super-admin", "/api/health", "/", "/pricing", "/terms", "/privacy", "/contact", "/auth/forgot-password", "/auth/reset-password"];

const auth = withAuth({
  pages: { signIn: "/auth/signin" },
  callbacks: {
    authorized({ token, req }) {
      const { pathname } = req.nextUrl;
      if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
      return !!token?.id;
    },
  },
});

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Inject pathname for layout to determine public vs app routes
  const response = NextResponse.next();
  response.headers.set("x-nextjs-pathname", pathname);

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const ip = ipFromRequest(request);
    const rl = rateLimit({ key: `api:${ip}`, limit: 120, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
      );
    }
  }

  // If it's a public path, skip auth check but still return the response with header
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return response;
  }

  return (auth as unknown as (req: NextRequest) => Promise<NextResponse | undefined>)(request);
}

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
    "/payments/:path*",
    "/banking/:path*",
    "/payroll/:path*",
    "/activity/:path*",
    "/parties/:path*",
    "/credit-notes/:path*",
    "/debit-notes/:path*",
    "/recurring-invoices/:path*",
    "/gst/:path*",
    "/currency/:path*",
    "/ai/:path*",
    "/api/:path*",
    "/delivery-challan/:path*",
    "/quotations/:path*",
    "/proforma-invoices/:path*",
    "/expenses/:path*",
  ],
};