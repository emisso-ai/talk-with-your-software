import { forwardRef, useImperativeHandle, useCallback } from "react";
import { TalkProvider } from "./context/talk-context";
import { useTalk } from "./hooks/use-talk";
import { ChatLauncher } from "./components/chat-launcher";
import { ChatContainer } from "./components/chat-container";
import { ChatHeader } from "./components/chat-header";
import { ChatMessages } from "./components/chat-messages";
import { ChatInput } from "./components/chat-input";
import { PoweredBy } from "./components/powered-by";

export interface TalkWidgetProps {
  endpoint: string;
  appName?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  greeting?: string;
  placeholder?: string;
  launcherIcon?: "chat" | "help" | "question";
  onOpen?: () => void;
  onClose?: () => void;
}

export interface TalkWidgetRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

function TalkWidgetInner({
  appName = "Chat",
  position = "bottom-right",
  primaryColor = "#10b981",
  greeting,
  placeholder,
  launcherIcon = "chat",
  innerRef,
}: Omit<TalkWidgetProps, "endpoint" | "onOpen" | "onClose"> & {
  innerRef: React.Ref<TalkWidgetRef>;
}) {
  const { isOpen, messages, isStreaming, sendMessage, toggleOpen, open, close, retry } =
    useTalk();

  useImperativeHandle(innerRef, () => ({
    open,
    close,
    toggle: toggleOpen,
  }));

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage]
  );

  return (
    <div className="talk-widget">
      <ChatContainer
        appName={appName}
        isOpen={isOpen}
        onClose={close}
        position={position}
        primaryColor={primaryColor}
      >
        <ChatHeader
          appName={appName}
          primaryColor={primaryColor}
          onClose={close}
        />
        <ChatMessages
          messages={messages}
          isStreaming={isStreaming}
          greeting={greeting}
          primaryColor={primaryColor}
          onRetry={retry}
        />
        <ChatInput
          onSend={handleSend}
          isStreaming={isStreaming}
          placeholder={placeholder}
          primaryColor={primaryColor}
        />
        <PoweredBy />
      </ChatContainer>
      <ChatLauncher
        position={position}
        primaryColor={primaryColor}
        isOpen={isOpen}
        onClick={toggleOpen}
        launcherIcon={launcherIcon}
      />
    </div>
  );
}

export const TalkWidget = forwardRef<TalkWidgetRef, TalkWidgetProps>(
  function TalkWidget(
    {
      endpoint,
      appName,
      position,
      primaryColor,
      greeting,
      placeholder,
      launcherIcon,
      onOpen,
      onClose,
    },
    ref
  ) {
    return (
      <TalkProvider
        endpoint={endpoint}
        greeting={greeting}
        onOpen={onOpen}
        onClose={onClose}
      >
        <TalkWidgetInner
          appName={appName}
          position={position}
          primaryColor={primaryColor}
          greeting={greeting}
          placeholder={placeholder}
          launcherIcon={launcherIcon}
          innerRef={ref}
        />
      </TalkProvider>
    );
  }
);
