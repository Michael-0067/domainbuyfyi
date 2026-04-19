import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const cookie = req.cookies.get("vbf_admin")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || cookie !== secret) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // All admin sub-pages (excludes /admin itself, which is the login page)
    "/admin/:path+",
    // All admin API routes except login
    "/api/admin/((?!login).*)",
  ],
};
