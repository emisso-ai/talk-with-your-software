import { motion } from "framer-motion";
import { useState, useCallback, type ReactNode } from "react";
import type { TalkMessage } from "../context/talk-context";

export interface ChatMessageProps {
  message: TalkMessage;
  primaryColor: string;
  onRetry: (messageId: string) => void;
}

function renderContent(content: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let remaining = content;
  let key = 0;

  // Split by code blocks first
  const codeBlockRegex = /```(\S+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(remaining)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      parts.push(
        ...renderInlineText(remaining.slice(lastIndex, match.index), key)
      );
      key += 100;
    }

    const filePath = match[1] ?? "";
    const code = match[2] ?? "";

    parts.push(
      <CodeBlock key={`code-${key++}`} filePath={filePath} content={code.trimEnd()} />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(...renderInlineText(remaining.slice(lastIndex), key));
  }

  return parts;
}

function renderInlineText(text: string, keyBase: number): ReactNode[] {
  const parts: ReactNode[] = [];
  // Handle bold, inline code
  const inlineRegex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    if (match[2]) {
      // Bold
      parts.push(
        <strong key={`b-${key++}`} style={{ fontWeight: 600 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code
          key={`c-${key++}`}
          style={{
            backgroundColor: "var(--talk-bg-secondary, #f3f4f6)",
            padding: "1px 5px",
            borderRadius: 4,
            fontSize: "0.875em",
            fontFamily: "monospace",
          }}
        >
          {match[3]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

function CodeBlock({ filePath, content }: { filePath: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        margin: "8px 0",
        border: "1px solid var(--talk-border, #e5e7eb)",
        fontSize: 12,
      }}
    >
      {filePath && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            backgroundColor: "var(--talk-bg-secondary, #f3f4f6)",
            color: "var(--talk-text-muted, #6b7280)",
            fontFamily: "monospace",
            fontSize: 11,
            borderBottom: "1px solid var(--talk-border, #e5e7eb)",
          }}
        >
          <span>{filePath}</span>
          <button
            onClick={handleCopy}
            style={{
              background: "none",
              border: "none",
              color: "var(--talk-text-muted, #6b7280)",
              cursor: "pointer",
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: 12,
          overflowX: "auto",
          backgroundColor: "var(--talk-bg, #ffffff)",
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--talk-text, #111827)",
        }}
      >
        {content}
      </pre>
    </div>
  );
}

export function ChatMessage({ message, primaryColor, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        alignSelf: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          backgroundColor: isUser
            ? primaryColor
            : "var(--talk-bubble-agent, #f3f4f6)",
          color: isUser
            ? "var(--talk-bubble-user-text, #ffffff)"
            : "var(--talk-bubble-agent-text, #111827)",
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {isUser ? message.content : renderContent(message.content)}
      </div>

      {/* Status indicator for user messages */}
      {isUser && (
        <span
          style={{
            fontSize: 11,
            color:
              message.status === "error"
                ? "#ef4444"
                : "var(--talk-text-muted, #6b7280)",
            marginTop: 2,
            paddingRight: 2,
          }}
        >
          {message.status === "sending" && "Sending..."}
          {message.status === "sent" && "Sent"}
          {message.status === "error" && (
            <>
              Failed to send{" "}
              <button
                onClick={() => onRetry(message.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 11,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Retry
              </button>
            </>
          )}
        </span>
      )}

      {/* Error state for assistant messages */}
      {!isUser && message.status === "error" && (
        <span
          style={{
            fontSize: 11,
            color: "#ef4444",
            marginTop: 2,
            paddingLeft: 2,
          }}
        >
          Error{" "}
          <button
            onClick={() => onRetry(message.id)}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 11,
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Retry
          </button>
        </span>
      )}
    </motion.div>
  );
}
