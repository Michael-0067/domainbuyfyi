"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-20 space-y-6">
      <h1 className="text-2xl font-bold text-center" style={{ color: "var(--text)" }}>Admin</h1>
      <form onSubmit={login} className="space-y-4 rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Password</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin password"
            className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
            autoFocus
          />
        </div>
        {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !secret}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
    </div>
  );
}
