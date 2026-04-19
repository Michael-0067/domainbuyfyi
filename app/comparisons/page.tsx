import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL } from "@/lib/site";
import { NICHE } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NICHE.subjectLabel} Comparisons`,
  description: `Browse side-by-side ${NICHE.subject} comparisons built by our readers — key facts, specs, and the informed take.`,
  alternates: { canonical: `${SITE_URL}/comparisons` },
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 12;

export default async function ComparisonsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PER_PAGE;

  const [comparisons, total] = await Promise.all([
    db.comparison.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PER_PAGE,
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: { slug: true, productName: true, imageUrls: true },
            },
          },
        },
      },
    }),
    db.comparison.count(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-8">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Comparisons" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap pt-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            {NICHE.subjectLabel} Comparisons
          </h1>
          <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
            Side-by-side comparisons built from our Briefs — key facts, specs, and the informed take.
          </p>
        </div>
        <Link
          href="/compare"
          className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
          style={{ background: "var(--accent)" }}
        >
          Create your own comparison →
        </Link>
      </div>

      {comparisons.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
          No comparisons yet. Be the first to{" "}
          <Link href="/compare" className="underline underline-offset-2" style={{ color: "var(--accent)" }}>
            create one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          {comparisons.map((comp) => (
            <Link
              key={comp.id}
              href={`/compare/${comp.slug}`}
              className="block rounded-2xl overflow-hidden hover:opacity-90 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Comparison header */}
              <div
                className="px-5 py-4 flex items-center justify-between gap-4"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <h2 className="text-base font-semibold leading-snug" style={{ color: "var(--accent)" }}>
                  {comp.title}
                </h2>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(comp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Products row */}
              <div className="px-5 py-4 flex items-start gap-5 flex-wrap">
                {comp.products.map((cp, idx) => {
                  const images = cp.product.imageUrls as string[] | null;
                  const thumb = images?.[0] ?? null;
                  return (
                    <div key={cp.id} className="flex items-center gap-3">
                      {idx > 0 && (
                        <span className="text-xs font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>vs</span>
                      )}
                      <div className="flex flex-col items-center gap-1.5 text-center" style={{ maxWidth: "100px" }}>
                        <div
                          className="rounded-xl overflow-hidden flex items-center justify-center"
                          style={{ width: 64, height: 64, background: "var(--surface-alt)", border: "1px solid var(--border)", flexShrink: 0 }}
                        >
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={cp.product.productName}
                              width={56}
                              height={56}
                              className="object-contain max-h-14"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded" style={{ background: "var(--border)" }} />
                          )}
                        </div>
                        <p className="text-xs leading-snug line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                          {cp.product.productName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <Link
              href={`/comparisons?page=${page - 1}`}
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
              href={`/comparisons?page=${page + 1}`}
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
            name: `${NICHE.subjectLabel} Comparisons`,
            url: `${SITE_URL}/comparisons`,
            itemListElement: comparisons.map((comp, i) => ({
              "@type": "ListItem",
              position: skip + i + 1,
              name: comp.title,
              url: `${SITE_URL}/compare/${comp.slug}`,
            })),
          }),
        }}
      />
    </div>
  );
}
