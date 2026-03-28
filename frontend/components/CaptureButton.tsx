"use client";

import { motion } from "framer-motion";

type CaptureButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function CaptureButton({ onClick, disabled = false }: CaptureButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/10 shadow-glow backdrop-blur-xl disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Capture city view"
    >
      <span className="absolute inset-0 rounded-full border border-cyan/40 animate-pulse-ring" />
      <span className="h-14 w-14 rounded-full border border-white/60 bg-white shadow-[0_0_40px_rgba(255,255,255,0.15)]" />
    </motion.button>
  );
}
