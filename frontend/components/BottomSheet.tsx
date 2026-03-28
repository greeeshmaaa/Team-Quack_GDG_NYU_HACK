"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GripHorizontal } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";

type BottomSheetProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({ open, title, children }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  const heightClass = useMemo(() => {
    return expanded ? "h-[78vh]" : "h-[42vh]";
  }, [expanded]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.08}
          onDragEnd={(_, info) => {
            if (info.offset.y > 60) {
              setExpanded(false);
            } else if (info.offset.y < -60) {
              setExpanded(true);
            }
          }}
          className={`absolute inset-x-0 bottom-0 z-20 ${heightClass} rounded-t-[2rem] border-t border-white/10 bg-[linear-gradient(180deg,rgba(16,20,34,0.96),rgba(4,5,11,0.98))] shadow-[0_-20px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl`}
        >
          <div className="mx-auto flex h-full w-full max-w-xl flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mx-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-mist/60"
              >
                <GripHorizontal className="h-4 w-4" />
                {title ?? "Response"}
              </button>
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="absolute right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mist/70"
                aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
              >
                <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>
            <div className="mt-5 flex-1 overflow-y-auto pb-8 hide-scrollbar">{children}</div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
