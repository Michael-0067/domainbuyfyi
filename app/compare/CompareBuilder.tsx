"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NICHE } from "@/lib/config";

interface BriefResult {
  id: string;
  slug: string;
  productName: string;
  category: string | null;
  thumb: string | null;
  priceDisplay: string | null;
}

export function CompareBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BriefResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [staged, setStaged] = useState<BriefResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suggestion pool — ref for always-current reads inside effects
  const poolRef = useRef<BriefResult[]>([]);
  const [pool, _setPool] = useState<BriefResult[]>([]);
  const prevCategoryRef = useRef<string>("__uninitialised__");
  const fetchingSuggestionsRef = useRef(false);
  const exhaustedRef = useRef(false);

  function setPool(next: BriefResult[]) {
    poolRef.current = next;
    _setPool(next);
  }
  function appendPool(items: BriefResult[]) {
    const seen = new Set(poolRef.current.map((p) => p.id));
    const fresh = items.filter((i) => !seen.has(i.id));
    if (fresh.length === 0) { exhaustedRef.current = true; return; }
    const next = [...poolRef.current, ...fresh];
    poolRef.current = next;
    _setPool(next);
  }

  const stagedIds = new Set(staged.map((s) => s.id));

  // Visible quick-select: pool items not yet staged, max 2
  const visibleSuggestions = pool.filter((p) => !stagedIds.has(p.id)).slice(0, 2);

  // Pre-stage a product when arriving from a Brief page via ?seed=<slug>
  useEffect(() => {
    const seed = searchParams.get("seed");
    if (!seed) return;
    fetch(`/api/compare/seed?slug=${encodeURIComponent(seed)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.result) setStaged([data.result]);
      })
      .catch(() => { /* silently ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manage suggestion pool whenever staged changes
  useEffect(() => {
    const category = staged[0]?.category ?? "";
    const stagedIdList = staged.map((s) => s.id);

    // Context changed (category or going from empty→seeded) — reset and fetch fresh
    if (category !== prevCategoryRef.current) {
      prevCategoryRef.current = category;
      exhaustedRef.current = false;
      fetchingSuggestionsRef.current = false;
      setPool([]);
      loadSuggestions(category, stagedIdList);
      return;
    }

    // Same context — top up if fewer than 2 non-staged suggestions remain
    const available = poolRef.current.filter((p) => !stagedIds.has(p.id));
    if (available.length < 2 && !exhaustedRef.current && !fetchingSuggestionsRef.current) {
      const excludeIds = [...new Set([...stagedIdList, ...poolRef.current.map((p) => p.id)])];
      loadSuggestions(category, excludeIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged]);

  async function loadSuggestions(category: string, excludeIds: string[]) {
    fetchingSuggestionsRef.current = true;
    try {
      const params = new URLSearchParams({ category, exclude: excludeIds.join(",") });
      const res = await fetch(`/api/compare/suggestions?${params}`);
      const data = await res.json();
      const items: BriefResult[] = data.results ?? [];
      if (items.length === 0) { exhaustedRef.current = true; return; }
      appendPool(items);
    } catch { /* silently ignore */ } finally {
      fetchingSuggestionsRef.current = false;
    }
  }

  // Search debounce
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/compare/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  function add(brief: BriefResult) {
    if (stagedIds.has(brief.id) || staged.length >= 3) return;
    setStaged((prev) => [...prev, brief]);
  }

  function remove(id: string) {
    setStaged((prev) => prev.filter((s) => s.id !== id));
  }

  async function compare() {
    if (staged.length < 2 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/compare/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: staged.map((s) => s.slug) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/compare/${data.slug}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canAdd = staged.length < 3;
  const canCompare = staged.length >= 2;

  return (
    <div className="space-y-6">

      {/* Search */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Search Briefs
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Type a ${NICHE.subject} name or keyword…`}
          className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
        />

        {searching && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Searching…</p>}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => {
              const already = stagedIds.has(r.id);
              const full = staged.length >= 3 && !already;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", opacity: already || full ? 0.5 : 1 }}
                >
                  {r.thumb ? (
                    <img src={r.thumb} alt={r.productName} className="w-10 h-10 rounded object-contain shrink-0" style={{ background: "var(--surface-alt)" }} />
                  ) : (
                    <div className="w-10 h-10 rounded shrink-0" style={{ background: "var(--surface-alt)" }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{r.productName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {[r.category, r.priceDisplay].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    onClick={() => add(r)}
                    disabled={already || full}
                    className="text-xs px-3 py-1 rounded-md font-medium shrink-0 disabled:opacity-40"
                    style={{
                      background: already ? "var(--surface-alt)" : "var(--accent)",
                      color: already ? "var(--text-muted)" : "white",
                    }}
                  >
                    {already ? "Added" : full ? "Full" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No Briefs found for &ldquo;{query}&rdquo;.</p>
        )}
      </div>

      {/* Quick-select suggestions */}
      {visibleSuggestions.length > 0 && canAdd && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Quick Compare
          </p>
          <div className="grid grid-cols-2 gap-3">
            {visibleSuggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => add(s)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {s.thumb ? (
                  <img src={s.thumb} alt={s.productName} className="w-9 h-9 rounded object-contain shrink-0" style={{ background: "var(--surface-alt)" }} />
                ) : (
                  <div className="w-9 h-9 rounded shrink-0" style={{ background: "var(--surface-alt)" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "var(--text)" }}>{s.productName}</p>
                  {s.priceDisplay && (
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: "var(--accent)" }}>{s.priceDisplay}</p>
                  )}
                </div>
                <span
                  className="text-base shrink-0 font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  +
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staged */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Selected {NICHE.subjectLabel} Products
          </p>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{staged.length} / 3</span>
        </div>

        {staged.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Add 2 or 3 {NICHE.subjectPlural} above to compare them side by side.</p>
        ) : (
          <div className="space-y-2">
            {staged.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {s.thumb ? (
                  <img src={s.thumb} alt={s.productName} className="w-10 h-10 rounded object-contain shrink-0" style={{ background: "var(--surface-alt)" }} />
                ) : (
                  <div className="w-10 h-10 rounded shrink-0" style={{ background: "var(--surface-alt)" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{s.productName}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{[s.category, s.priceDisplay].filter(Boolean).join(" · ")}</p>
                </div>
                <button onClick={() => remove(s.id)} className="text-xs px-2 py-1 rounded hover:opacity-70 shrink-0" style={{ color: "#ef4444" }} aria-label="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

        <button
          onClick={compare}
          disabled={!canCompare || submitting}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ background: "var(--accent)" }}
        >
          {submitting
            ? "Creating comparison…"
            : staged.length < 2
            ? `Add ${2 - staged.length} more to compare`
            : `Compare ${staged.length} ${NICHE.subjectPlural} →`}
        </button>
      </div>

    </div>
  );
}
