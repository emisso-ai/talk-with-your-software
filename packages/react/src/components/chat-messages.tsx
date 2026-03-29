import { useEffect, useLayoutEffect, useRef } from "react";
import type { TalkMessage } from "../context/talk-context";
import { ChatMessage } from "./chat-message";
import { TypingIndicator } from "./typing-indicator";

export interface ChatMessagesProps {
  messages: TalkMessage[];
  isStreaming: boolean;
  greeting?: string;
  primaryColor: string;
  onRetry: (messageId: string) => void;
}

export function ChatMessages({
  messages,
  isStreaming,
  greeting,
  primaryColor,
  onRetry,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Instant scroll on mount
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // Smooth scroll on new messages
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {messages.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
            color: "var(--talk-text-muted, #6b7280)",
            padding: "32px 16px",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 32 }} role="img" aria-label="wave">
            {"\uD83D\uDC4B"}
          </span>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            {greeting || "Hi! Ask me anything about the codebase."}
          </p>
        </div>
      )}
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          primaryColor={primaryColor}
          onRetry={onRetry}
        />
      ))}
      {isStreaming &&
        messages[messages.length - 1]?.role === "assistant" &&
        messages[messages.length - 1]?.content === "" && <TypingIndicator />}
    </div>
  );
}
