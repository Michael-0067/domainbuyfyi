import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { generateRoundupSummary, generateRoundupNarrative } from "@/lib/generate/roundup";
import { affiliateUrl, affiliateUrlFromAsin } from "@/lib/amazon";

function isAdmin(req: NextRequest) {
  return req.cookies.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
}

// GET — list all roundups (admin)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roundups = await db.roundup.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true } } },
  });

  return NextResponse.json({ roundups });
}

// POST — create a roundup.
//   Builder path: { title, category, productIds, draft: true } → saves draft, returns slug immediately.
//   Legacy path:  { title, category, slugs } → generates AI content and publishes in one shot.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: unknown; slugs?: unknown; productIds?: unknown; category?: unknown; draft?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const workingTitle = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : null;
  const isDraft = body.draft === true;

  if (!workingTitle) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // ── Resolve ordered product list ──────────────────────────────────────────
  let ordered: { id: string; slug: string; productName: string; briefContent: string | null; priceData: unknown; category: string | null; imageUrls: unknown; canonicalSourceUrl: string | null; asin: string | null }[];

  if (Array.isArray(body.productIds) && (body.productIds as unknown[]).length > 0) {
    const productIds = (body.productIds as unknown[]).filter((s): s is string => typeof s === "string");
    if (productIds.length < 2) return NextResponse.json({ error: "At least 2 products required" }, { status: 400 });

    const products = await db.product.findMany({
      where: { id: { in: productIds }, pageStatus: "complete" },
      select: { id: true, slug: true, productName: true, briefContent: true, priceData: true, category: true, imageUrls: true, canonicalSourceUrl: true, asin: true },
    });
    ordered = productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof ordered;
  } else {
    const slugs = Array.isArray(body.slugs) ? (body.slugs as unknown[]).filter((s): s is string => typeof s === "string") : [];
    if (slugs.length < 2) return NextResponse.json({ error: "At least 2 products required" }, { status: 400 });

    const products = await db.product.findMany({
      where: { slug: { in: slugs }, pageStatus: "complete" },
      select: { id: true, slug: true, productName: true, briefContent: true, priceData: true, category: true, imageUrls: true, canonicalSourceUrl: true, asin: true },
    });
    ordered = slugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean) as typeof ordered;
  }

  if (ordered.length < 2) return NextResponse.json({ error: "Not enough complete products found" }, { status: 404 });

  // ── Build slug ────────────────────────────────────────────────────────────
  let roundupSlug = workingTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  let attempt = 0;
  while (await db.roundup.findUnique({ where: { slug: roundupSlug }, select: { id: true } })) {
    attempt++;
    roundupSlug = `${roundupSlug}-${attempt}`;
  }

  // ── Draft path: save record only, no AI ───────────────────────────────────
  if (isDraft) {
    const roundup = await db.roundup.create({
      data: {
        title: workingTitle,
        slug: roundupSlug,
        category: category || null,
        status: "draft",
        items: {
          create: ordered.map((p, i) => {
            const price = p.priceData as { display?: string } | null;
            const images = p.imageUrls as string[] | null;
            let amazon: string | null = null;
            if (p.canonicalSourceUrl) { try { amazon = affiliateUrl(p.canonicalSourceUrl); } catch { /* skip */ } }
            else if (p.asin) amazon = affiliateUrlFromAsin(p.asin);
            return {
              productId: p.id,
              position: i + 1,
              titleSnapshot: p.productName,
              priceSnapshot: price?.display ?? null,
              categorySnapshot: p.category ?? null,
              thumbSnapshot: images?.[0] ?? null,
              briefUrl: `/briefs/${p.slug}`,
              amazonUrl: amazon,
            };
          }),
        },
      },
    });
    return NextResponse.json({ slug: roundup.slug });
  }

  // ── Publish path: generate AI content then save ───────────────────────────
  const summaries = await Promise.all(
    ordered.map((p) => generateRoundupSummary(p.productName, p.briefContent ?? ""))
  );

  const narrative = await generateRoundupNarrative(
    workingTitle,
    ordered.map((p, i) => ({ productName: p.productName, summary: summaries[i] }))
  );

  const roundup = await db.roundup.create({
    data: {
      title: workingTitle,
      slug: roundupSlug,
      category: category || null,
      status: "published",
      introText: narrative.introText,
      closingText: narrative.closingText,
      publishedAt: new Date(),
      items: {
        create: ordered.map((p, i) => {
          const price = p.priceData as { display?: string } | null;
          const images = p.imageUrls as string[] | null;
          let amazon: string | null = null;
          if (p.canonicalSourceUrl) { try { amazon = affiliateUrl(p.canonicalSourceUrl); } catch { /* skip */ } }
          else if (p.asin) amazon = affiliateUrlFromAsin(p.asin);
          return {
            productId: p.id,
            position: i + 1,
            generatedSummary: summaries[i],
            titleSnapshot: p.productName,
            priceSnapshot: price?.display ?? null,
            categorySnapshot: p.category ?? null,
            thumbSnapshot: images?.[0] ?? null,
            briefUrl: `/briefs/${p.slug}`,
            amazonUrl: amazon,
          };
        }),
      },
    },
  });

  return NextResponse.json({ slug: roundup.slug });
}

// PATCH — update roundup status (publish/draft/delete)
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: unknown; status?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const id = typeof body.id === "string" ? body.id : null;
  const status = typeof body.status === "string" ? body.status : null;

  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const updated = await db.roundup.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ slug: updated.slug });
}

// DELETE — remove a roundup
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.roundup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
