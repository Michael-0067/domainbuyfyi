"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface BriefResult {
  id: string;
  slug: string;
  productName: string;
  category: string | null;
  thumb: string | null;
  priceDisplay: string | null;
  lastGeneratedAt: string | null;
  briefUrl: string;
  amazonUrl: string | null;
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none";
const inputStyle = {
  background: "var(--surface-alt)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as React.CSSProperties;

export default function NewRoundupPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BriefResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [staged, setStaged] = useState<BriefResult[]>([]);
  const stagedIds = new Set(staged.map((s) => s.id));

  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/roundups/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  function addToStaged(brief: BriefResult) {
    if (stagedIds.has(brief.id)) return;
    setStaged((prev) => [...prev, brief]);
  }

  function removeFromStaged(id: string) {
    setStaged((prev) => prev.filter((s) => s.id !== id));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setStaged((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setStaged((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  async function saveDraft(): Promise<string | null> {
    setError("");
    if (!title.trim()) { setError("Enter a roundup title first."); return null; }
    if (staged.length < 2) { setError("Add at least 2 Briefs."); return null; }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/roundups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || undefined,
          productIds: staged.map((s) => s.id),
          draft: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed."); return null; }
      return data.slug as string;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const slug = await saveDraft();
    if (slug) router.push(`/admin/roundups`);
  }

  async function handleBuild() {
    setError("");
    if (!title.trim()) { setError("Enter a roundup title first."); return; }
    if (staged.length < 2) { setError("Add at least 2 Briefs."); return; }

    setBuilding(true);
    try {
      const slug = await saveDraft();
      if (!slug) { setBuilding(false); return; }

      const res = await fetch(`/api/admin/roundups/${slug}/build`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Build failed."); setBuilding(false); return; }

      router.push(`/roundups/${slug}`);
    } catch {
      setError("Build failed. Check server logs.");
      setBuilding(false);
    }
  }

  const busy = saving || building;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Roundup Builder
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Search existing Briefs, stage them in order, then build the roundup page.
          </p>
        </div>
        <a href="/admin/roundups" className="text-sm" style={{ color: "var(--text-muted)" }}>
          ← All Roundups
        </a>
      </div>

      {/* ── Metadata ── */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Roundup Details
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Best Robot Vacuums: 8 Briefs Compared"
              maxLength={120}
              className={inputCls}
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              This becomes the page title and slug. The AI writes intro and closing — you own the title.
            </p>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Category (optional)
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Robot Vacuum"
              maxLength={60}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>
        {title && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Slug preview:{" "}
            <span className="font-mono">
              /roundups/{title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80)}
            </span>
          </p>
        )}
      </div>

      {/* ── Search Briefs ── */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Search Briefs
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a product name or keyword..."
          className={inputCls}
          style={inputStyle}
        />

        {searching && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Searching...</p>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((r) => {
              const already = stagedIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{
                    background: already ? "var(--surface-alt)" : "var(--bg)",
                    border: "1px solid var(--border)",
                    opacity: already ? 0.5 : 1,
                  }}
                >
                  {r.thumb ? (
                    <img src={r.thumb} alt={r.productName} className="w-10 h-10 rounded object-contain shrink-0"
                      style={{ background: "var(--surface-alt)" }} />
                  ) : (
                    <div className="w-10 h-10 rounded shrink-0" style={{ background: "var(--surface-alt)" }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {r.productName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {[r.category, r.priceDisplay].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={r.briefUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      View
                    </a>
                    <button
                      onClick={() => addToStaged(r)}
                      disabled={already}
                      className="text-xs px-3 py-1 rounded-md font-medium disabled:opacity-40"
                      style={{
                        background: already ? "var(--surface-alt)" : "var(--accent)",
                        color: already ? "var(--text-muted)" : "white",
                      }}
                    >
                      {already ? "Added" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No Briefs found for &quot;{query}&quot;.</p>
        )}
      </div>

      {/* ── Staged Briefs ── */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Staged Briefs
          </p>
          <span className="text-xs font-mono" style={{ color: staged.length >= 6 ? "#166534" : "var(--text-muted)" }}>
            {staged.length} selected {staged.length < 2 ? `(need ${2 - staged.length} more)` : staged.length > 10 ? "(max 10)" : "✓"}
          </span>
        </div>

        {staged.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No Briefs staged yet. Search above and add them.
          </p>
        ) : (
          <div className="space-y-2">
            {staged.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: "var(--text-muted)" }}>
                  {idx + 1}
                </span>
                {s.thumb ? (
                  <img src={s.thumb} alt={s.productName} className="w-10 h-10 rounded object-contain shrink-0"
                    style={{ background: "var(--surface-alt)" }} />
                ) : (
                  <div className="w-10 h-10 rounded shrink-0" style={{ background: "var(--surface-alt)" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                    {s.productName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {[s.category, s.priceDisplay].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="px-1.5 py-1 rounded text-xs disabled:opacity-20 hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === staged.length - 1}
                    className="px-1.5 py-1 rounded text-xs disabled:opacity-20 hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFromStaged(s.id)}
                    className="px-1.5 py-1 rounded text-xs hover:opacity-70 ml-1"
                    style={{ color: "#ef4444" }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p
          className="text-sm px-4 py-2 rounded-lg"
          style={{ color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </p>
      )}

      {/* ── Build controls ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleBuild}
          disabled={busy || staged.length < 2 || !title.trim()}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {building ? "Building..." : "Build Roundup"}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={busy || staged.length < 1 || !title.trim()}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
        <a
          href="/admin/roundups"
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Cancel
        </a>
      </div>

      {building && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Generating {staged.length} card summaries plus intro and closing copy. This takes about {Math.ceil(staged.length * 5)} seconds — do not close this tab.
        </div>
      )}
    </div>
  );
}
