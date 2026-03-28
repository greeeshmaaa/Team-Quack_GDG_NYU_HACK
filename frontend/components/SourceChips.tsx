"use client";

import { Database, Orbit, Sparkles } from "lucide-react";
import { SourceItem } from "@/lib/types";

const iconMap = {
  json: Database,
  dataset: Database,
  vertex_ai: Sparkles,
  derived: Orbit,
};

export function SourceChips({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => {
        const Icon = iconMap[source.kind];
        return (
          <span
            key={`${source.label}-${source.kind}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-mist/75"
          >
            <Icon className="h-3.5 w-3.5" />
            {source.label}
          </span>
        );
      })}
    </div>
  );
}
