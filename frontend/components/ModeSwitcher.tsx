"use client";

import { motion } from "framer-motion";
import { BookOpenText, Building2, Sparkles } from "lucide-react";
import { Mode } from "@/lib/types";

const modes: { id: Mode; label: string; icon: typeof Sparkles }[] = [
  { id: "ask", label: "Ask", icon: BookOpenText },
  { id: "story", label: "Story", icon: Sparkles },
  { id: "community", label: "Community", icon: Building2 },
];

type ModeSwitcherProps = {
  value: Mode;
  onChange: (mode: Mode) => void;
};

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  return (
    <div className="glass relative inline-flex rounded-full border border-white/10 p-1 shadow-card">
      <motion.div
        layoutId="mode-indicator"
        className="absolute inset-y-1 rounded-full bg-white/12 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_12px_30px_rgba(76,167,255,0.18)]"
        style={{
          width: "calc(33.333% - 0.25rem)",
          left:
            value === "ask"
              ? "0.25rem"
              : value === "story"
                ? "calc(33.333% + 0.1rem)"
                : "calc(66.666% - 0.05rem)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      />
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`relative z-10 flex min-w-[6rem] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm transition ${
            value === id ? "text-white" : "text-mist/65"
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
