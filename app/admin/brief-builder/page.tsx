"use client";

import { useState } from "react";
import Link from "next/link";

// Accepts: name.tld or name.sld.tld (e.g. domain.co.uk)
// Rejects: protocols, www, subdomains (>3 parts), paths
function isValidDomain(value: string): boolean {
  if (/^https?:\/\//i.test(value)) return false;
  if (/^www\./i.test(value)) return false;
  if (value.includes("/") || value.includes("@")) return false;
  const parts = value.split(".");
  if (parts.length < 2 || parts.length > 3) return false;
  return parts.every((p) => /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(p));
}

export default function BriefBuilderPage() {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "duplicate" | "error">("idle");
  const [result, setResult] = useState<{ slug?: string; cached?: boolean; error?: string } | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    if (val.trim() && !isValidDomain(val.trim())) {
      setValidationError("Enter a plain domain only — e.g. example.com or domain.co.uk. No http, www, or paths.");
    } else {
      setValidationError("");
    }
  }

  async function buildBrief(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isValidDomain(trimmed)) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Unknown error" });
        setStatus("error");
      } else if (data.cached) {
        setResult(data);
        setStatus("duplicate");
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

  const canSubmit = status !== "loading" && input.trim() !== "" && !validationError;

  return (
    <div className="space-y-8 max-w-xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/briefs" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>← Briefs</Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Brief Builder</h1>
      </div>

      <form onSubmit={buildBrief} className="space-y-4 rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Domain Name
          </label>
          <input
            type="text"
            value={input}
            onChange={handleChange}
            placeholder="e.g. example.com or domain.co.uk"
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
            style={{
              background: "var(--surface-alt)",
              border: `1px solid ${validationError ? "var(--error)" : "var(--border)"}`,
              color: "var(--text)",
            }}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {validationError && (
            <p className="text-xs" style={{ color: "var(--error)" }}>{validationError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {status === "loading" ? "Building — this takes ~30 seconds…" : "Create Domain Brief"}
        </button>
      </form>

      {status === "done" && result?.slug && (
        <div className="rounded-xl p-5 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold" style={{ color: "#16a34a" }}>Brief created successfully.</p>
          <Link
            href={`/briefs/${result.slug}`}
            className="text-sm underline underline-offset-2 hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            View: /briefs/{result.slug}
          </Link>
        </div>
      )}

      {status === "duplicate" && result?.slug && (
        <div className="rounded-xl p-5 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--error)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--error)" }}>
            Duplicate — a Brief for this domain already exists.
          </p>
          <Link
            href={`/briefs/${result.slug}`}
            className="text-sm underline underline-offset-2 hover:opacity-80"
            style={{ color: "var(--accent)" }}
          >
            View existing: /briefs/{result.slug}
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
