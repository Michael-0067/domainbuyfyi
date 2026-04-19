import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL } from "@/lib/site";
import { NICHE } from "@/lib/config";
import type { PriceData } from "@/lib/normalize";
import type { ReviewSummaryData } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NICHE.subjectLabel} Briefs`,
  description: `Informed ${NICHE.subject} Briefs — structured analysis on ${NICHE.productDescription}.`,
  alternates: { canonical: `${SITE_URL}/briefs` },
};

interface Props {
  searchParams: Promise<{ category?: string; page?: string }>;
}

const PER_PAGE = 12;

export default async function BriefsPage({ searchParams }: Props) {
  const { category, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PER_PAGE;

  const where = {
    pageStatus: "complete",
    ...(category ? { category } : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { lastGeneratedAt: "desc" },
      skip,
      take: PER_PAGE,
      select: {
        id: true, slug: true, productName: true, brand: true, category: true,
        imageUrls: true, priceData: true, reviewSummaryData: true,
      },
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const categories = await db.product.findMany({
    where: { pageStatus: "complete", category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const uniqueCategories = categories.map((c) => c.category).filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Briefs" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 pt-2">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {NICHE.subjectLabel} Briefs
          </h1>
          <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
            Structured, informed analysis on {NICHE.productDescription}.
          </p>
        </div>
        <Link
          href="/compare"
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
          style={{ background: "var(--accent)" }}
        >
          Compare →
        </Link>
      </div>

      {/* Category filters */}
      {uniqueCategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/briefs"
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80"
            style={{
              background: !category ? "var(--accent)" : "var(--surface-alt)",
              color: !category ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            All
          </Link>
          {uniqueCategories.map((cat) => (
            <Link
              key={cat}
              href={`/briefs?category=${encodeURIComponent(cat)}`}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80"
              style={{
                background: category === cat ? "var(--accent)" : "var(--surface-alt)",
                color: category === cat ? "white" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
          No Briefs found{category ? ` in "${category}"` : ""}.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const images = product.imageUrls as string[] | null;
            const thumb = images?.[0] ?? null;
            const price = product.priceData as PriceData | null;
            const reviewData = product.reviewSummaryData as ReviewSummaryData | null;

            return (
              <article
                key={product.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <Link href={`/briefs/${product.slug}`} className="block">
                  <div
                    className="flex items-center justify-center h-40"
                    style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)" }}
                  >
                    {thumb ? (
                      <Image src={thumb} alt={product.productName} width={140} height={140} className="max-h-36 w-auto object-contain" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl" style={{ background: "var(--border)" }} />
                    )}
                  </div>
                </Link>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  {product.category && (
                    <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>
                      {product.category}
                    </p>
                  )}
                  <Link href={`/briefs/${product.slug}`}>
                    <h2 className="font-semibold text-sm leading-snug hover:underline underline-offset-2" style={{ color: "var(--text)" }}>
                      {product.productName}
                    </h2>
                  </Link>
                  {product.brand && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{product.brand}</p>
                  )}

                  <div className="flex items-center gap-3 mt-auto pt-2">
                    {price?.display && (
                      <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{price.display}</span>
                    )}
                    {reviewData?.rating != null && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        ★ {reviewData.rating.toFixed(1)}
                        {reviewData.ratingsTotal != null && <> · {reviewData.ratingsTotal.toLocaleString()}</>}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/briefs/${product.slug}`}
                    className="block text-center text-xs font-semibold py-2 rounded-lg text-white hover:opacity-90 transition-opacity mt-1"
                    style={{ background: "var(--accent)" }}
                  >
                    Read Brief →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <Link
              href={`/briefs?${category ? `category=${encodeURIComponent(category)}&` : ""}page=${page - 1}`}
              className="text-sm px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/briefs?${category ? `category=${encodeURIComponent(category)}&` : ""}page=${page + 1}`}
              className="text-sm px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Next →
            </Link>
          )}
        </div>
      )}
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${NICHE.subjectLabel} Briefs`,
            url: `${SITE_URL}/briefs`,
            itemListElement: products.map((product, i) => ({
              "@type": "ListItem",
              position: skip + i + 1,
              name: product.productName,
              url: `${SITE_URL}/briefs/${product.slug}`,
            })),
          }),
        }}
      />
    </div>
  );
}
