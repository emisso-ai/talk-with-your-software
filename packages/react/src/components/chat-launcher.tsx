import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

export interface ChatLauncherProps {
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  isOpen: boolean;
  onClick: () => void;
  launcherIcon?: "chat" | "help" | "question";
  customIcon?: ReactNode;
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
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
  );
}

const iconMap = {
  chat: ChatIcon,
  help: HelpIcon,
  question: QuestionIcon,
};

export function ChatLauncher({
  position,
  primaryColor,
  isOpen,
  onClick,
  launcherIcon = "chat",
  customIcon,
}: ChatLauncherProps) {
  const Icon = iconMap[launcherIcon];

  const positionStyles: React.CSSProperties = {
    position: "fixed",
    bottom: 20,
    zIndex: 2147483647,
    ...(position === "bottom-right" ? { right: 20 } : { left: 20 }),
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        ...positionStyles,
        width: 56,
        height: 56,
        borderRadius: "50%",
        backgroundColor: primaryColor,
        color: "#ffffff",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
        outline: "none",
        padding: 0,
      }}
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.span
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <CloseIcon />
          </motion.span>
        ) : (
          <motion.span
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {customIcon ?? <Icon />}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
