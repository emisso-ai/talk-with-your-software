import { useState, useCallback, useRef, type KeyboardEvent } from "react";

export interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  placeholder?: string;
  primaryColor: string;
}

export function ChatInput({
  onSend,
  isStreaming,
  placeholder,
  primaryColor,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid var(--talk-border, #e5e7eb)",
        backgroundColor: "var(--talk-bg, #ffffff)",
        flexShrink: 0,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          handleInput();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask about the code..."}
        disabled={isStreaming}
        rows={1}
        style={{
          flex: 1,
          resize: "none",
          border: "1px solid var(--talk-border, #e5e7eb)",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 14,
          lineHeight: 1.5,
          fontFamily: "inherit",
          backgroundColor: "var(--talk-bg, #ffffff)",
          color: "var(--talk-text, #111827)",
          outline: "none",
          minHeight: 36,
          maxHeight: 120,
          transition: "border-color 150ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = primaryColor;
          e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}33`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--talk-border, #e5e7eb)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || isStreaming}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor:
            !value.trim() || isStreaming ? "var(--talk-border, #e5e7eb)" : primaryColor,
          color: "#ffffff",
          border: "none",
          cursor: !value.trim() || isStreaming ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background-color 150ms ease",
          opacity: !value.trim() || isStreaming ? 0.5 : 1,
        }}
        aria-label="Send message"
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
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  );
}
