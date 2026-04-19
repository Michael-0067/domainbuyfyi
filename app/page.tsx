import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db/prisma";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { NICHE } from "@/lib/config";
import { affiliateUrl, affiliateUrlFromAsin } from "@/lib/amazon";
import type { GeneratedPageData } from "@/lib/generate/sections";
import type { PriceData } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

export default async function HomePage() {
  const [recentBriefs, recentComparisons, recentRoundups, recentForCategories] = await Promise.all([
    db.product.findMany({
      where: { pageStatus: "complete" },
      orderBy: { lastGeneratedAt: "desc" },
      take: 6,
      select: {
        id: true, slug: true, productName: true, brand: true, category: true,
        imageUrls: true, priceData: true, generatedPageData: true,
        canonicalSourceUrl: true, asin: true,
      },
    }),
    db.comparison.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, slug: true, title: true, createdAt: true },
    }),
    db.roundup.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, slug: true, title: true, publishedAt: true },
    }),
    db.product.findMany({
      where: { pageStatus: "complete", category: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { category: true, imageUrls: true },
    }),
  ]);

  // Pick first 3 products from distinct categories — in recency order
  const featuredCategories: { category: string; thumb: string | null }[] = [];
  const seenCategories = new Set<string>();
  for (const p of recentForCategories) {
    if (!p.category || seenCategories.has(p.category)) continue;
    const images = p.imageUrls as string[] | null;
    featuredCategories.push({ category: p.category, thumb: images?.[0] ?? null });
    seenCategories.add(p.category);
    if (featuredCategories.length === 3) break;
  }

  return (
    <div className="space-y-16">

      {/* Hero */}
      <section className="space-y-4 pt-4">
        <h1 className="text-4xl font-bold tracking-tight leading-tight" style={{ color: "var(--text)" }}>
          {NICHE.heroLine1}<br />{NICHE.heroLine2}
        </h1>
        <p className="text-lg max-w-xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {NICHE.heroSubtext}
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            {NICHE.heroCtaPrimary}
          </Link>
          <Link
            href="/briefs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Browse All Briefs
          </Link>
        </div>
      </section>

      {/* Recent Briefs */}
      {recentBriefs.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Recent Briefs</h2>
            <Link href="/briefs" className="text-sm hover:underline underline-offset-2" style={{ color: "var(--accent)" }}>
              All Briefs →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentBriefs.map((product) => {
              const images = product.imageUrls as string[] | null;
              const thumb = images?.[0] ?? null;
              const price = product.priceData as PriceData | null;
              const pageData = product.generatedPageData as GeneratedPageData | null;
              const keyFacts = pageData?.keyFactsSummary ?? null;

              let amazonHref: string | null = null;
              if (product.canonicalSourceUrl) {
                try { amazonHref = affiliateUrl(product.canonicalSourceUrl); } catch { /* skip */ }
              } else if (product.asin) {
                amazonHref = affiliateUrlFromAsin(product.asin);
              }

              return (
                <article
                  key={product.id}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {/* Product image */}
                  <Link href={`/briefs/${product.slug}`} className="block">
                    <div
                      className="flex items-center justify-center h-44"
                      style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)" }}
                    >
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={product.productName}
                          width={160}
                          height={160}
                          className="max-h-40 w-auto object-contain"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl" style={{ background: "var(--border)" }} />
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="space-y-0.5">
                      {product.category && (
                        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>
                          {product.category}
                        </p>
                      )}
                      <Link href={`/briefs/${product.slug}`}>
                        <h3 className="font-semibold text-sm leading-snug hover:underline underline-offset-2" style={{ color: "var(--text)" }}>
                          {product.productName}
                        </h3>
                      </Link>
                      {product.brand && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{product.brand}</p>
                      )}
                    </div>

                    {price?.display && (
                      <p className="text-base font-bold" style={{ color: "var(--accent)" }}>{price.display}</p>
                    )}

                    {keyFacts && (
                      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                        {keyFacts.replace(/^-\s*/gm, "").split("\n")[0]}
                      </p>
                    )}

                    <div className="mt-auto pt-3 flex gap-2">
                      <Link
                        href={`/briefs/${product.slug}`}
                        className="flex-1 text-center text-xs font-semibold py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                        style={{ background: "var(--accent)" }}
                      >
                        Read Brief
                      </Link>
                      {amazonHref && (
                        <a
                          href={amazonHref}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex-1 text-center text-xs py-2 rounded-lg hover:opacity-80 transition-opacity"
                          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                        >
                          Amazon ↗
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Compare CTA */}
      <section
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-xl font-bold" style={{ color: "var(--accent)" }}>
          Can&apos;t decide between two?
        </h2>
        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Select 2 or 3 {NICHE.subjectPlural} and compare them side by side — key facts, specs, buyer patterns, and the informed take.
          Comparison pages are permanent and shareable.
        </p>
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "var(--accent)" }}
        >
          Start a Comparison →
        </Link>
      </section>

      {/* Recent Comparisons */}
      {recentComparisons.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Recent Comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentComparisons.map((comp) => (
              <Link
                key={comp.id}
                href={`/compare/${comp.slug}`}
                className="rounded-xl p-4 hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-medium leading-snug" style={{ color: "var(--text)" }}>{comp.title}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {new Date(comp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Roundups */}
      {recentRoundups.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Roundups</h2>
            <Link href="/roundups" className="text-sm hover:underline underline-offset-2" style={{ color: "var(--accent)" }}>
              All Roundups →
            </Link>
          </div>
          <div className="space-y-2">
            {recentRoundups.map((roundup) => (
              <Link
                key={roundup.id}
                href={`/roundups/${roundup.slug}`}
                className="flex items-center justify-between rounded-xl px-4 py-3 hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{roundup.title}</p>
                {roundup.publishedAt && (
                  <p className="text-xs shrink-0 ml-4" style={{ color: "var(--text-muted)" }}>
                    {new Date(roundup.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Categories */}
      {featuredCategories.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Browse by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {featuredCategories.map(({ category, thumb }) => (
              <Link
                key={category}
                href={`/briefs?category=${encodeURIComponent(category)}`}
                className="rounded-2xl overflow-hidden flex flex-col group hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="flex items-center justify-center h-48"
                  style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)" }}
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={category}
                      width={180}
                      height={180}
                      className="max-h-44 w-auto object-contain"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl" style={{ background: "var(--border)" }} />
                  )}
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {category}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    Browse →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            description: `Structured ${NICHE.subject} product intelligence — informed Briefs, comparisons, and roundups.`,
          }),
        }}
      />
    </div>
  );
}
