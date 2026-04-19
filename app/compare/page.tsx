import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { CompareBuilder } from "./CompareBuilder";
import { SITE_URL } from "@/lib/site";
import { NICHE } from "@/lib/config";

export const metadata: Metadata = {
  title: `Compare ${NICHE.subjectLabel} Products`,
  description: `Compare 2 or 3 ${NICHE.subject} Briefs side by side — key facts, specs, buyer patterns, and the informed take.`,
  alternates: { canonical: `${SITE_URL}/compare` },
};

export default async function ComparePage() {
  const recentComparisons = await db.comparison.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, slug: true, title: true, createdAt: true },
  });

  return (
    <div className="space-y-8">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: `Compare ${NICHE.subjectLabel} Products` }]} />

      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Compare {NICHE.subjectLabel} Products
        </h1>
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
          Search for 2 or 3 {NICHE.subject} Briefs and compare them side by side — key facts, specs, review patterns,
          and the informed take. Comparison pages are permanent and shareable.
        </p>
      </div>

      <CompareBuilder />

      {recentComparisons.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Recent Comparisons
          </p>
          <div className="space-y-2">
            {recentComparisons.map((comp) => (
              <Link
                key={comp.id}
                href={`/compare/${comp.slug}`}
                className="flex items-center justify-between rounded-lg px-4 py-3 hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{comp.title}</p>
                <p className="text-xs ml-4 shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(comp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
