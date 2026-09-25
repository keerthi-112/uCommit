import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
}

export default function PrimaryButton({
  children,
  onClick,
}: Props) {
  return (
    <motion.button
      whileHover={{
        scale: 1.05,
      }}
      whileTap={{
        scale: 0.95,
      }}
      onClick={onClick}
      style={{
        background: "#22C55E",
        color: "#0B1120",
        border: "none",
        padding: "14px 24px",
        borderRadius: "12px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </motion.button>
  );
}