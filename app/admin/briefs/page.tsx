import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import type { PriceData } from "@/lib/normalize";
import DeleteProductButton from "./DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function AdminBriefsPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) redirect("/admin");

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, productName: true, brand: true, category: true,
      pageStatus: true, imageUrls: true, priceData: true, lastGeneratedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Briefs</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/roundups"
            className="text-sm px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Roundups
          </Link>
          <Link
            href="/admin/brief-builder"
            className="text-sm px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity font-semibold"
            style={{ background: "var(--accent)" }}
          >
            + Add Brief
          </Link>
        </div>
      </div>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {products.length} product{products.length !== 1 ? "s" : ""} total
      </p>

      <div className="space-y-2">
        {products.map((p) => {
          const images = p.imageUrls as string[] | null;
          const thumb = images?.[0] ?? null;
          const price = p.priceData as PriceData | null;
          return (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded" style={{ background: "var(--surface-alt)" }}>
                {thumb ? (
                  <Image src={thumb} alt={p.productName} width={36} height={36} className="max-h-9 w-auto object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded" style={{ background: "var(--border)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{p.productName}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {[p.brand, p.category, price?.display].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: p.pageStatus === "complete" ? "#dcfce7" : "#fef9c3",
                    color: p.pageStatus === "complete" ? "#16a34a" : "#ca8a04",
                  }}
                >
                  {p.pageStatus}
                </span>
                <Link
                  href={`/briefs/${p.slug}`}
                  className="text-xs hover:underline underline-offset-2"
                  style={{ color: "var(--accent)" }}
                >
                  View →
                </Link>
                <DeleteProductButton id={p.id} name={p.productName} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
