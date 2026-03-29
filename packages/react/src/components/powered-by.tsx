import { useState } from "react";

export function PoweredBy() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "6px 16px",
        borderTop: "1px solid var(--talk-border, #e5e7eb)",
        backgroundColor: "var(--talk-bg, #ffffff)",
        flexShrink: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href="https://emisso.ai"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 11,
          color: "var(--talk-text-muted, #6b7280)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "color 150ms ease",
        }}
      >
        Powered by Emisso
        {hovered && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.6 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </a>
    </div>
  );
}
