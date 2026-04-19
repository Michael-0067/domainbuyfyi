import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { generateRoundupSummary, generateRoundupNarrative } from "@/lib/generate/roundup";
import { affiliateUrl, affiliateUrlFromAsin } from "@/lib/amazon";
import { SITE_NAME } from "@/lib/site";

function isAdmin(req: NextRequest) {
  return req.cookies.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  const roundup = await db.roundup.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: {
            select: { id: true, productName: true, briefContent: true, canonicalSourceUrl: true, asin: true },
          },
        },
      },
    },
  });

  if (!roundup) return NextResponse.json({ error: "Roundup not found" }, { status: 404 });

  await db.roundup.update({ where: { slug }, data: { status: "building" } });

  try {
    // Step 1: Generate card summaries in parallel
    const summaryResults = await Promise.all(
      roundup.items.map(async (item) => {
        const briefContent = item.product.briefContent ?? "";
        const summary = briefContent
          ? await generateRoundupSummary(item.titleSnapshot, briefContent)
          : `A Product Brief is available for ${item.titleSnapshot} on ${SITE_NAME}.`;
        return { id: item.id, productName: item.titleSnapshot, summary };
      })
    );

    // Step 2: Generate intro + closing narrative
    const narrative = await generateRoundupNarrative(
      roundup.title,
      summaryResults.map(({ productName, summary }) => ({ productName, summary }))
    );

    // Step 3: Persist card summaries and affiliate URLs
    await Promise.all(
      summaryResults.map(({ id, summary }) => {
        const item = roundup.items.find((i) => i.id === id)!;
        let amazonUrl: string | null = item.amazonUrl;
        if (!amazonUrl) {
          if (item.product.canonicalSourceUrl) {
            try { amazonUrl = affiliateUrl(item.product.canonicalSourceUrl); } catch { /* skip */ }
          } else if (item.product.asin) {
            amazonUrl = affiliateUrlFromAsin(item.product.asin);
          }
        }
        return db.roundupItem.update({
          where: { id },
          data: { generatedSummary: summary, amazonUrl },
        });
      })
    );

    // Step 4: Publish roundup with narrative
    await db.roundup.update({
      where: { slug },
      data: {
        introText:   narrative.introText,
        closingText: narrative.closingText,
        status:      "published",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    console.error("Roundup build failed:", err);
    await db.roundup.update({ where: { slug }, data: { status: "draft" } });
    return NextResponse.json({ error: "Build failed" }, { status: 500 });
  }
}
