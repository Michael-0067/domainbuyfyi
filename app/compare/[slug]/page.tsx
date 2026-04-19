import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL } from "@/lib/site";
import { NICHE } from "@/lib/config";
import { affiliateUrl, affiliateUrlFromAsin } from "@/lib/amazon";
import type { GeneratedPageData } from "@/lib/generate/sections";
import type { NormalizedAttributes, PriceData } from "@/lib/normalize";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comparison = await db.comparison.findUnique({ where: { slug }, select: { title: true } });
  if (!comparison) return {};
  return {
    title: comparison.title,
    description: `${NICHE.subjectLabel} comparison: ${comparison.title}. Side-by-side key facts, specs, buyer patterns, and informed analysis.`,
    alternates: { canonical: `${SITE_URL}/compare/${slug}` },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;

  const comparison = await db.comparison.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: {
          product: {
            select: {
              id: true, slug: true, productName: true, brand: true, category: true,
              imageUrls: true, priceData: true, normalizedAttributes: true,
              generatedPageData: true, reviewSummaryData: true,
              canonicalSourceUrl: true, asin: true,
            },
          },
        },
      },
    },
  });

  if (!comparison) notFound();

  const ordered = comparison.products.map((cp) => cp.product);
  if (ordered.length < 2) notFound();

  const cols = ordered.length;
  const gridCls = cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3";

  function buildAffiliateUrl(product: typeof ordered[0]): string | null {
    if (product.canonicalSourceUrl) {
      try { return affiliateUrl(product.canonicalSourceUrl); } catch { /* fall through */ }
    }
    if (product.asin) return affiliateUrlFromAsin(product.asin);
    return null;
  }

  const rows = ordered.map((product, i) => {
    const pageData = product.generatedPageData as GeneratedPageData | null;
    const attrs = product.normalizedAttributes as NormalizedAttributes | null;
    const priceData = product.priceData as PriceData | null;
    const images = product.imageUrls as string[] | null;
    const reviewData = product.reviewSummaryData as { rating?: number | null; ratingsTotal?: number | null } | null;
    const ri = pageData?.reviewIntelligence;
    const overview = pageData?.overview ?? null;
    const overviewExcerpt = overview && overview.length > 300
      ? overview.slice(0, overview.lastIndexOf(" ", 300)) + "…"
      : overview;

    return {
      product,
      priceData,
      thumb: images?.[0] ?? null,
      reviewData,
      keyFacts: pageData?.keyFactsSummary ?? null,
      overviewExcerpt,
      praise: ri?.commonPraise?.slice(0, 3) ?? [],
      complaints: ri?.commonComplaints?.slice(0, 3) ?? [],
      specs: attrs?.specifications ? Object.entries(attrs.specifications).slice(0, 5) : [],
      amazonUrl: buildAffiliateUrl(product),
      isLast: i === cols - 1,
    };
  });

  const hasKeyFacts   = rows.some((r) => r.keyFacts);
  const hasTake       = rows.some((r) => r.overviewExcerpt);
  const hasPraise     = rows.some((r) => r.praise.length > 0);
  const hasComplaints = rows.some((r) => r.complaints.length > 0);
  const hasSpecs      = rows.some((r) => r.specs.length > 0);

  const divider = { borderColor: "var(--border)" } as React.CSSProperties;

  function cellCls(isLast: boolean) {
    return `p-4${isLast ? "" : " sm:border-r"}`;
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <div className="col-span-full px-4 py-2 border-t" style={{ background: "var(--surface-alt)", ...divider }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb crumbs={[
        { label: "Home", href: "/" },
        { label: "Compare", href: "/compare" },
        { label: "Comparison" },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 pt-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{comparison.title}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {cols} {NICHE.subjectPlural} compared · key facts, buyer patterns, specs
          </p>
        </div>
        <Link href="/compare" className="text-sm mt-3 hover:underline underline-offset-2" style={{ color: "var(--accent)" }}>
          ← New comparison
        </Link>
      </div>

      {/* Comparison table */}
      <div className={`grid ${gridCls} rounded-2xl overflow-hidden`} style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

        {/* Product headers */}
        {rows.map(({ product, priceData, thumb, reviewData, isLast }) => (
          <div key={`${product.slug}-hdr`} className={`${cellCls(isLast)} space-y-3`} style={divider}>
            <div className="flex justify-center">
              {thumb ? (
                <div className="w-20 h-24 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
                  <Image src={thumb} alt={product.productName} width={80} height={96} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-20 h-24 rounded-xl" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }} />
              )}
            </div>
            <div className="space-y-1 text-center">
              <Link href={`/briefs/${product.slug}`} className="font-semibold text-sm leading-snug hover:underline underline-offset-2 block" style={{ color: "var(--text)" }}>
                {product.productName}
              </Link>
              {product.brand && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{product.brand}</p>}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {priceData?.display && (
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{priceData.display}</span>
                )}
                {reviewData?.rating != null && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    ★ {reviewData.rating.toFixed(1)}
                    {reviewData.ratingsTotal != null && <> · {reviewData.ratingsTotal.toLocaleString()}</>}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Key Facts */}
        {hasKeyFacts && (
          <>
            <SectionLabel label="Key Facts" />
            {rows.map(({ product, keyFacts, isLast }) => (
              <div key={`${product.slug}-kf`} className={cellCls(isLast)} style={divider}>
                {keyFacts
                  ? <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{keyFacts}</p>
                  : <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>}
              </div>
            ))}
          </>
        )}

        {/* The Take */}
        {hasTake && (
          <>
            <SectionLabel label="The Take" />
            {rows.map(({ product, overviewExcerpt, isLast }) => (
              <div key={`${product.slug}-take`} className={cellCls(isLast)} style={divider}>
                {overviewExcerpt
                  ? <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{overviewExcerpt}</p>
                  : <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>}
              </div>
            ))}
          </>
        )}

        {/* Buyers Liked */}
        {hasPraise && (
          <>
            <SectionLabel label="Buyers Liked" />
            {rows.map(({ product, praise, isLast }) => (
              <div key={`${product.slug}-praise`} className={cellCls(isLast)} style={divider}>
                {praise.length > 0 ? (
                  <ul className="space-y-1">
                    {praise.map((item, i) => (
                      <li key={i} className="text-xs leading-snug flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span className="shrink-0 mt-0.5" style={{ color: "#16a34a" }}>+</span>{item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>
                )}
              </div>
            ))}
          </>
        )}

        {/* Buyers Flagged */}
        {hasComplaints && (
          <>
            <SectionLabel label="Buyers Flagged" />
            {rows.map(({ product, complaints, isLast }) => (
              <div key={`${product.slug}-complaints`} className={cellCls(isLast)} style={divider}>
                {complaints.length > 0 ? (
                  <ul className="space-y-1">
                    {complaints.map((item, i) => (
                      <li key={i} className="text-xs leading-snug flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span className="shrink-0 mt-0.5" style={{ color: "#dc2626" }}>−</span>{item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>
                )}
              </div>
            ))}
          </>
        )}

        {/* Specs */}
        {hasSpecs && (
          <>
            <SectionLabel label="Specs" />
            {rows.map(({ product, specs, isLast }) => (
              <div key={`${product.slug}-specs`} className={cellCls(isLast)} style={divider}>
                {specs.length > 0 ? (
                  <dl className="space-y-1">
                    {specs.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <dt className="shrink-0 font-medium" style={{ color: "var(--text-muted)", minWidth: "72px" }}>{k}</dt>
                        <dd style={{ color: "var(--text-secondary)" }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>
                )}
              </div>
            ))}
          </>
        )}

        {/* CTAs */}
        <div className="col-span-full border-t" style={{ ...divider, background: "var(--surface-alt)" }} />
        {rows.map(({ product, amazonUrl, isLast }) => (
          <div key={`${product.slug}-cta`} className={`${cellCls(isLast)} flex flex-col gap-2`} style={divider}>
            <Link
              href={`/briefs/${product.slug}`}
              className="block text-center text-xs font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity text-white"
              style={{ background: "var(--accent)" }}
            >
              Read full Brief →
            </Link>
            {amazonUrl && (
              <a
                href={amazonUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block text-center text-xs py-2 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                View on Amazon ↗
              </a>
            )}
          </div>
        ))}

      </div>

      <div className="text-center pt-2">
        <Link href="/compare" className="text-sm hover:underline underline-offset-2" style={{ color: "var(--text-muted)" }}>
          ← Start a new comparison
        </Link>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": rows.map(({ product, priceData, thumb, reviewData, amazonUrl }) => ({
              "@type": "Product",
              name: product.productName,
              ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
              ...(thumb ? { image: thumb } : {}),
              url: `${SITE_URL}/briefs/${product.slug}`,
              ...(priceData?.value
                ? {
                    offers: {
                      "@type": "Offer",
                      price: priceData.value,
                      priceCurrency: priceData.currency ?? "USD",
                      availability: "https://schema.org/InStock",
                      ...(amazonUrl ? { url: amazonUrl } : {}),
                    },
                  }
                : {}),
              ...(reviewData?.rating
                ? {
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: reviewData.rating,
                      ...(reviewData.ratingsTotal != null ? { reviewCount: reviewData.ratingsTotal } : {}),
                    },
                  }
                : {}),
            })),
          }),
        }}
      />
    </div>
  );
}
