"use client";

import { motion } from "framer-motion";

export function LoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-md"
    >
      <div className="w-[78%] max-w-sm rounded-[1.8rem] border border-white/10 bg-black/55 p-5 shadow-card">
        <div className="h-3 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(101,224,255,0.35),rgba(255,255,255,0.08))] bg-[length:200%_100%] animate-shimmer" />
        <div className="mt-3 h-3 w-2/3 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(101,224,255,0.28),rgba(255,255,255,0.08))] bg-[length:200%_100%] animate-shimmer" />
        <div className="mt-6 space-y-3">
          <div className="h-16 rounded-[1.2rem] bg-white/[0.05]" />
          <div className="h-16 rounded-[1.2rem] bg-white/[0.05]" />
        </div>
      </div>
    </motion.div>
  );
}
