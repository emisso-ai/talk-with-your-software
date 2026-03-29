import {
  createContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface TalkMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "sending" | "streaming" | "sent" | "error";
  codeSnippets?: Array<{
    filePath: string;
    content: string;
    startLine?: number;
    endLine?: number;
  }>;
  timestamp: Date;
}

export interface TalkWidgetState {
  isOpen: boolean;
  messages: TalkMessage[];
  isStreaming: boolean;
  error: string | null;
}

export interface TalkContextValue extends TalkWidgetState {
  sendMessage: (text: string) => Promise<void>;
  toggleOpen: () => void;
  open: () => void;
  close: () => void;
  retry: (messageId: string) => void;
}

export const TalkContext = createContext<TalkContextValue | null>(null);

function generateId(): string {
  return `talk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseCodeSnippets(
  content: string
): TalkMessage["codeSnippets"] | undefined {
  const codeBlockRegex = /```(\S+)?\n([\s\S]*?)```/g;
  const snippets: NonNullable<TalkMessage["codeSnippets"]> = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const filePath = match[1] ?? "code";
    const codeContent = match[2] ?? "";
    snippets.push({ filePath, content: codeContent.trimEnd() });
  }

  return snippets.length > 0 ? snippets : undefined;
}

export interface TalkProviderProps {
  endpoint: string;
  children: ReactNode;
  greeting?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export function TalkProvider({
  endpoint,
  children,
  onOpen,
  onClose,
}: TalkProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) onOpen?.();
      else onClose?.();
      return next;
    });
  }, [onOpen, onClose]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: TalkMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        status: "sending",
        timestamp: new Date(),
      };

      const assistantId = generateId();
      const assistantMessage: TalkMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setError(null);

      // Mark user message as sent
      setMessages((prev) =>
        prev.map((m) => (m.id === userMessage.id ? { ...m, status: "sent" } : m))
      );

      abortRef.current = new AbortController();

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text.trim() }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }

        // Finalize the assistant message
        const codeSnippets = parseCodeSnippets(accumulated);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, status: "sent", content: accumulated, codeSnippets }
              : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, status: "error", content: errorMessage }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [endpoint, isStreaming]
  );

  const retry = useCallback(
    (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex < 0) return;

      // Find the user message before the errored assistant message
      const errored = messages[messageIndex];
      if (!errored) return;

      let userText: string | undefined;
      if (errored.role === "assistant" && messageIndex > 0) {
        userText = messages[messageIndex - 1]?.content;
        // Remove the errored assistant message
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else if (errored.role === "user") {
        userText = errored.content;
      }

      if (userText) {
        // Remove the errored messages and resend
        setMessages((prev) =>
          prev.filter(
            (m) =>
              m.id !== messageId &&
              !(
                errored.role === "assistant" &&
                messageIndex > 0 &&
                m.id === messages[messageIndex - 1]?.id
              )
          )
        );
        void sendMessage(userText);
      }
    },
    [messages, sendMessage]
  );

  const value: TalkContextValue = {
    isOpen,
    messages,
    isStreaming,
    error,
    sendMessage,
    toggleOpen,
    open,
    close,
    retry,
  };

  return <TalkContext.Provider value={value}>{children}</TalkContext.Provider>;
}
