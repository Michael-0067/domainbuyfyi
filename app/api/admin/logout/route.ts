import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

export function GET() {
  const res = NextResponse.redirect(new URL("/", SITE_URL));
  res.cookies.delete("vbf_admin");
  return res;
}
