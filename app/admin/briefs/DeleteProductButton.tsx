"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openModal() { setOpen(true); setError(""); }
  function closeModal() { setOpen(false); setError(""); }

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Delete failed");
        return;
      }
      closeModal();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="text-xs px-2 py-1 rounded hover:opacity-75 transition-opacity"
        style={{ color: "var(--error)", border: "1px solid var(--error)" }}
        title="Delete domain"
      >
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="rounded-2xl p-6 space-y-4 max-w-sm w-full"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Delete domain?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text)" }}>{name}</strong> will be permanently removed,
              including any roundup or comparison appearances. This cannot be undone.
            </p>
            {error && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "var(--error-light)", color: "var(--error)" }}>
                {error}
              </p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={closeModal}
                disabled={loading}
                className="text-sm px-4 py-2 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-sm px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: "var(--error)" }}
              >
                {loading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
