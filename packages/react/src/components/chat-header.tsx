export interface ChatHeaderProps {
  appName: string;
  primaryColor: string;
  onClose: () => void;
}

export function ChatHeader({ appName, primaryColor, onClose }: ChatHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 48,
        padding: "0 16px",
        backgroundColor: primaryColor,
        color: "#ffffff",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {appName}
      </span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#ffffff",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          opacity: 0.8,
          transition: "opacity 150ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
        }}
        aria-label="Close chat"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
