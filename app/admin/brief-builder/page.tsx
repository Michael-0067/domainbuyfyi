"use client";

import { useState } from "react";
import Link from "next/link";

export default function BriefBuilderPage() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ slug?: string; cached?: boolean; error?: string } | null>(null);

  async function buildBrief(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Unknown error" });
        setStatus("error");
      } else {
        setResult(data);
        setStatus("done");
        setInput("");
      }
    } catch {
      setResult({ error: "Network error" });
      setStatus("error");
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/briefs" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>← Briefs</Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Brief Builder</h1>
      </div>

      <form onSubmit={buildBrief} className="space-y-4 rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Amazon URL or ASIN
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. B08F6ZV2L4 or https://amazon.com/dp/…"
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading" || !input.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {status === "loading" ? "Building — this takes ~30 seconds…" : "Create Product Brief"}
        </button>
      </form>

      {status === "done" && result?.slug && (
        <div className="rounded-xl p-5 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>
            {result.cached ? "Already exists — found existing Brief." : "Brief created successfully."}
          </p>
          <Link
            href={`/briefs/${result.slug}`}
            className="text-sm underline underline-offset-2 hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            View: /briefs/{result.slug}
          </Link>
        </div>
      )}

      {status === "error" && result?.error && (
        <div className="rounded-xl p-5" style={{ background: "var(--error-light)", border: "1px solid var(--error)" }}>
          <p className="text-sm" style={{ color: "var(--error)" }}>{result.error}</p>
        </div>
      )}
    </div>
  );
}
