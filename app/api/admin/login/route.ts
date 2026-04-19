import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: { secret?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const secret = typeof body.secret === "string" ? body.secret : "";
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("vbf_admin", secret, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
