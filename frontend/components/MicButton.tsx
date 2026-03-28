"use client";

import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

type MicButtonProps = {
  active: boolean;
  onToggle: () => void;
};

export function MicButton({ active, onToggle }: MicButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-xl transition ${
        active
          ? "border-cyan/60 bg-cyan/15 text-cyan shadow-glow"
          : "border-white/15 bg-black/35 text-white"
      }`}
      aria-label={active ? "Disable voice input" : "Enable voice input"}
    >
      {active ? <span className="absolute inset-0 rounded-full border border-cyan/40 animate-pulse-ring" /> : null}
      {active ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
    </motion.button>
  );
}
