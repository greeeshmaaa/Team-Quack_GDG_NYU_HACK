"use client";

import { motion } from "framer-motion";
import { AskResponse } from "@/lib/types";

type AskCardProps = {
  response: AskResponse;
};

export function AskCard({ response }: AskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Answer</p>
        <p className="mt-3 text-[15px] leading-7 text-white/92">{response.answer}</p>
      </div>
      <div className="grid gap-3">
        {response.facts.map((fact, index) => (
          <motion.div
            key={`${fact.label}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index }}
            className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-mist/55">{fact.label}</p>
            <p className="mt-2 text-sm leading-6 text-white/88">{fact.value}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
