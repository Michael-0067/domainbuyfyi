import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) redirect("/admin");

  const [briefCount, pendingCount, roundupCount] = await Promise.all([
    db.product.count({ where: { pageStatus: "complete" } }),
    db.product.count({ where: { pageStatus: "pending" } }),
    db.roundup.count({ where: { status: "published" } }),
  ]);

  const tiles = [
    {
      label: "Briefs",
      href: "/admin/briefs",
      description: `${briefCount} published${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`,
      cta: "Manage →",
    },
    {
      label: "Add Brief",
      href: "/admin/brief-builder",
      description: "Build a new product Brief from a URL or ASIN",
      cta: "Open Builder →",
    },
    {
      label: "Add Roundup",
      href: "/admin/roundups/new",
      description: `${roundupCount} roundup${roundupCount !== 1 ? "s" : ""} published`,
      cta: "New Roundup →",
    },
  ];

  return (
    <div className="space-y-8 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Admin</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{SITE_NAME}</p>
        </div>
        <a
          href="/api/admin/logout"
          className="text-xs hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          Log out
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-2xl p-6 flex flex-col gap-3 hover:opacity-90 transition-opacity"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              {tile.label}
            </p>
            <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>
              {tile.description}
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{tile.cta}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
