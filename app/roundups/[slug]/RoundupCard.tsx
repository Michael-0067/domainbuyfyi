"use client";

import { useState } from "react";
import Link from "next/link";

interface RoundupCardProps {
  item: {
    id: string;
    titleSnapshot: string;
    categorySnapshot: string | null;
    priceSnapshot: string | null;
    thumbSnapshot: string | null;
    briefUrl: string;
    amazonUrl: string | null;
    generatedSummary: string | null;
  };
  index: number;
}

const TRUNCATE_AT = 350;

function truncateAtWord(text: string, limit: number): { short: string; truncated: boolean } {
  if (text.length <= limit) return { short: text, truncated: false };
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return { short: cut.slice(0, lastSpace > 0 ? lastSpace : limit), truncated: true };
}

export default function RoundupCard({ item, index }: RoundupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const summary = item.generatedSummary ?? "";
  const { short, truncated } = truncateAtWord(summary, TRUNCATE_AT);
  const displayText = expanded ? summary : short;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Card header */}
      <div className="flex items-start gap-4 p-5 pb-4">
        <span
          className="text-sm font-bold mt-0.5 w-7 shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {index + 1}
        </span>
        {item.thumbSnapshot && (
          <div
            className="shrink-0 rounded-xl overflow-hidden"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <img
              src={item.thumbSnapshot}
              alt={item.titleSnapshot}
              className="w-20 h-20 object-contain"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold leading-snug">
            <Link href={item.briefUrl} style={{ color: "var(--text)" }}>
              {item.titleSnapshot}
            </Link>
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {item.categorySnapshot && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {item.categorySnapshot}
              </span>
            )}
            {item.priceSnapshot && (
              <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                {item.priceSnapshot}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary — collapsible */}
      {summary && (
        <div className="px-5 pb-4 pl-16">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {displayText}
            {truncated && !expanded && (
              <>
                {"… "}
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs hover:opacity-70 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  read more
                </button>
              </>
            )}
          </p>
          {truncated && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-1.5 text-xs hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              read less
            </button>
          )}
        </div>
      )}

      {/* Footer buttons */}
      <div
        className="flex items-center gap-3 px-5 py-3 pl-16"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Link
          href={item.briefUrl}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "var(--accent)" }}
        >
          Read Full Brief
        </Link>
        {item.amazonUrl && (
          <a
            href={item.amazonUrl}
            target="_blank"
            rel="noreferrer noopener nofollow"
            className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            See on Amazon ↗
          </a>
        )}
      </div>
    </div>
  );
}
