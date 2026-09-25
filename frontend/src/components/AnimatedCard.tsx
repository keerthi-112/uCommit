import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AnimatedCard({
  children,
}: Props) {
  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      transition={{
        duration: 0.2,
      }}
      style={{
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "20px",
        padding: "24px",
      }}
    >
      {children}
    </motion.div>
  );
}