import { motion } from "framer-motion";

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: "var(--talk-text-muted, #6b7280)",
};

export function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 14px",
        borderRadius: "12px 12px 12px 2px",
        backgroundColor: "var(--talk-bubble-agent, #f3f4f6)",
        alignSelf: "flex-start",
        maxWidth: "fit-content",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={dotStyle}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
