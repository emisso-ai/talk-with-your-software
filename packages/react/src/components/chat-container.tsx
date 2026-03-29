import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

export interface ChatContainerProps {
  appName: string;
  isOpen: boolean;
  onClose: () => void;
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  children: ReactNode;
}

export function ChatContainer({
  isOpen,
  position,
  children,
}: ChatContainerProps) {
  const positionStyles: React.CSSProperties = {
    position: "fixed",
    bottom: 88,
    zIndex: 2147483646,
    ...(position === "bottom-right" ? { right: 20 } : { left: 20 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            ...positionStyles,
            width: 400,
            height: 600,
            borderRadius: "var(--talk-radius, 12px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--talk-bg, #ffffff)",
            boxShadow: "var(--talk-shadow, 0 8px 30px rgba(0, 0, 0, 0.12))",
            border: "1px solid var(--talk-border, #e5e7eb)",
            fontFamily: "var(--talk-font, -apple-system, BlinkMacSystemFont, sans-serif)",
          }}
          className="talk-widget-container"
        >
          <style>{`
            @media (max-width: 768px) {
              .talk-widget-container {
                width: 100vw !important;
                height: 100vh !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                border-radius: 0 !important;
                border: none !important;
              }
            }
          `}</style>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
