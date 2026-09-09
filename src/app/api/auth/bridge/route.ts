/**
 * POST /api/auth/bridge
 * Body: { token }
 *
 * Verifies the CRM bridge token server-side (HMAC + replay check), then
 * triggers a NextAuth signin with the crm-bridge provider. On success the
 * browser has a normal BizzBills session cookie — one-click login done.
 *
 * The token is SINGLE-USE: this endpoint consumes it; retries need a fresh
 * token from the CRM.
 */
import { NextResponse } from "next/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { verifyBridgeToken } from "@/lib/bridge";

export async function POST(request: Request) {
  try {
    const rl = rateLimit({ key: `bridge:${ipFromRequest(request)}`, limit: 10 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { token } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Bridge token is required" }, { status: 400 });
    }

    // Pre-verify so we can return a precise error before hitting NextAuth
    const payload = verifyBridgeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired bridge token. Return to CRM and try again." },
        { status: 401 }
      );
    }

    // Delegate to NextAuth credentials endpoint with the bridge provider
    // (internal call keeps CSRF/cookie handling inside NextAuth)
    const origin = new URL(request.url).origin;
    const csrfRes = await fetch(`${origin}/api/auth/csrf`, {
      headers: { cookie: request.headers.get("cookie") || "" },
    });
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const form = new URLSearchParams({
      csrfToken,
      token,
      json: "true",
    });

    const signinRes = await fetch(`${origin}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: request.headers.get("cookie") || "",
      },
      body: form.toString(),
      redirect: "manual",
    });

    // NextAuth sets session cookies on this response — forward them
    const setCookies = signinRes.headers.getSetCookie?.() ?? [];
    const nextRes = NextResponse.json({
      success: signinRes.ok || (signinRes.status === 302 && setCookies.length > 0),
      user: { email: payload.email },
    });
    for (const c of setCookies) nextRes.headers.append("set-cookie", c);

    if (!nextRes.headers.get("set-cookie")) {
      return NextResponse.json(
        { error: "Bridge sign-in failed. Return to CRM and retry." },
        { status: 401 }
      );
    }
    return nextRes;
  } catch (error) {
    console.error("Bridge auth error:", error);
    return NextResponse.json({ error: "Bridge auth failed" }, { status: 500 });
  }
}
