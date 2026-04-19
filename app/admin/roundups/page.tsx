"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Roundup {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  items: { id: string }[];
}

export default function AdminRoundupsPage() {
  const [roundups, setRoundups] = useState<Roundup[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRoundups() {
    const res = await fetch("/api/admin/roundups");
    if (res.ok) {
      const data = await res.json();
      setRoundups(data.roundups ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadRoundups(); }, []);

  async function toggleStatus(roundup: Roundup) {
    const newStatus = roundup.status === "published" ? "draft" : "published";
    await fetch("/api/admin/roundups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: roundup.id, status: newStatus }),
    });
    loadRoundups();
  }

  async function deleteRoundup(id: string) {
    if (!confirm("Delete this roundup?")) return;
    await fetch(`/api/admin/roundups?id=${id}`, { method: "DELETE" });
    loadRoundups();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Roundups</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/roundups/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)" }}
          >
            + New Roundup
          </Link>
          <Link href="/admin/briefs" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
            ← Briefs
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : roundups.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No roundups yet.</p>
      ) : (
        <div className="space-y-2">
          {roundups.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{r.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {r.items.length} brief{r.items.length !== 1 ? "s" : ""}
                  {r.publishedAt ? ` · ${new Date(r.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: r.status === "published" ? "#dcfce7" : r.status === "building" ? "#dbeafe" : "#fef9c3",
                    color: r.status === "published" ? "#16a34a" : r.status === "building" ? "#1d4ed8" : "#ca8a04",
                  }}
                >
                  {r.status}
                </span>
                <Link href={`/roundups/${r.slug}`} className="text-xs hover:underline" style={{ color: "var(--accent)" }}>View</Link>
                <button onClick={() => toggleStatus(r)} className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>
                  {r.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => deleteRoundup(r.id)} className="text-xs hover:underline" style={{ color: "var(--error)" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
