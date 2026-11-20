import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { consumeDirectAuthRequest, loginOrigin } from "@/lib/login-rate-limit";

export default async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const limit = await consumeDirectAuthRequest(loginOrigin(req.headers));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de acesso. Tente novamente mais tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
    return NextResponse.next();
  }
  const session = await auth();
  if (!session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/app/:path*", "/api/auth/callback/credentials"],
};
