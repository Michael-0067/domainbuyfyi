import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { ingestDomain } from "@/lib/generate/domain-pipeline";

function isAdminRequest(req: NextRequest): boolean {
  return req.cookies.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
}

function isDomainInput(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return false;
  if (/^www\./i.test(input)) return false;
  if (input.includes("/") || input.includes("@")) return false;
  const parts = input.split(".");
  if (parts.length < 2 || parts.length > 3) return false;
  return parts.every((p) => /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(p));
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: string;
  try {
    const body = (await req.json()) as { input?: unknown };
    input = typeof body.input === "string" ? body.input.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!input) return NextResponse.json({ error: "No input provided" }, { status: 400 });

  if (!isDomainInput(input)) {
    return NextResponse.json(
      { error: "Enter a plain domain name only — e.g. example.com or domain.co.uk. No http, www, or paths." },
      { status: 400 }
    );
  }

  try {
    const cached = await findCachedDomain(input);
    if (cached) return NextResponse.json({ slug: cached.slug, cached: true });

    const product = await ingestDomain(input);
    return NextResponse.json({ slug: product.slug, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ingest]", message);
    return NextResponse.json({ error: `Something went wrong: ${message}` }, { status: 500 });
  }
}

async function findCachedDomain(domain: string) {
  const slug = domain.toLowerCase().replace(/\./g, "-");
  const bySlug = await db.product.findFirst({
    where: { slug, pageStatus: "complete" },
    select: { slug: true },
  });
  if (bySlug) return bySlug;
  return db.product.findFirst({
    where: { productName: domain, pageStatus: "complete" },
    select: { slug: true },
  });
}
