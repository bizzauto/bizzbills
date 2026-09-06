import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const publicPaths = ["/auth/signin", "/auth/register", "/api/auth", "/api/setup", "/api/seed-super-admin", "/api/health", "/", "/pricing", "/plans", "/terms", "/privacy", "/contact", "/auth/forgot-password", "/auth/reset-password", "/portal", "/offline", "/sw.js", "/manifest.json"];

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

  // This app defines ZERO Server Actions (no "use server" anywhere) — all
  // mutations go through REST API routes. Any request carrying a Next-Action
  // header is therefore a bot/scanner probe (seen: "x", "0", "1", "action"),
  // not a real client. Reject it early so it neither reaches route handlers
  // nor floods the server log with "Failed to find Server Action" errors.
  // NOTE: remove this guard if real Server Actions are ever introduced.
  if (request.headers.has("next-action")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
    // Catch-all: run the proxy on every path. The Next-Action bot guard must
    // fire on EVERY request — scanners probe unmatched paths too (/, /auth/*,
    // /wp-login.php, random junk). Auth is enforced inside the handler itself
    // (publicPaths skip it), so a catch-all does not change who can reach what.
    // Static assets (public/, _next/static, images, favicon) are excluded.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};