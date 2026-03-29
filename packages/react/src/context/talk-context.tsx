import {
  createContext,
  useCallback,
  useMemo,
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

/** Extract code snippets from markdown code blocks. */
const CODE_BLOCK_REGEX = /```(\S+)?\n([\s\S]*?)```/g;

function parseCodeSnippets(
  content: string
): TalkMessage["codeSnippets"] | undefined {
  const snippets: NonNullable<TalkMessage["codeSnippets"]> = [];
  let match: RegExpExecArray | null;

  CODE_BLOCK_REGEX.lastIndex = 0;
  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
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
        status: "sent",
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

        // Server returns JSON (not SSE) with a TalkResult
        const result = await response.json();

        const content = result.success ? result.answer : (result.error?.message ?? "Something went wrong");
        const status = result.success ? "sent" : "error";
        const codeSnippets = result.success ? parseCodeSnippets(content) : undefined;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, status, content, codeSnippets }
              : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, status: "error" as const, content: errorMessage }
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
      // Use functional state update to avoid stale closure over messages
      setMessages((prev) => {
        const messageIndex = prev.findIndex((m) => m.id === messageId);
        if (messageIndex < 0) return prev;

        const errored = prev[messageIndex];
        let userText: string | undefined;

        if (errored.role === "assistant" && messageIndex > 0) {
          userText = prev[messageIndex - 1]?.content;
        } else if (errored.role === "user") {
          userText = errored.content;
        }

        if (!userText) return prev;

        // Remove errored messages (assistant + its preceding user message)
        const idsToRemove = new Set<string>();
        idsToRemove.add(messageId);
        if (errored.role === "assistant" && messageIndex > 0) {
          idsToRemove.add(prev[messageIndex - 1].id);
        }

        // Schedule resend after state update
        setTimeout(() => void sendMessage(userText!), 0);

        return prev.filter((m) => !idsToRemove.has(m.id));
      });
    },
    [sendMessage]
  );

  const value = useMemo<TalkContextValue>(
    () => ({
      isOpen,
      messages,
      isStreaming,
      sendMessage,
      toggleOpen,
      open,
      close,
      retry,
    }),
    [isOpen, messages, isStreaming, sendMessage, toggleOpen, open, close, retry]
  );

  return <TalkContext.Provider value={value}>{children}</TalkContext.Provider>;
}
