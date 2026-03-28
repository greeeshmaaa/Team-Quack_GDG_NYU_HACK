"use client";

import { MapPin, Radar, Sparkles } from "lucide-react";
import { ResponseMeta } from "@/lib/types";

type ResultHeaderProps = {
  title: string;
  landmarkName: string;
  meta: ResponseMeta;
};

export function ResultHeader({ title, landmarkName, meta }: ResultHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-mist/70">
          <Radar className="h-3.5 w-3.5" />
          Live Lens
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-mist/70">
          <MapPin className="h-4 w-4" />
          <span>{landmarkName}</span>
          {meta.neighborhood ? <span>• {meta.neighborhood}</span> : null}
          {meta.borough ? <span>• {meta.borough}</span> : null}
        </div>
      </div>
      <div className="rounded-2xl border border-cyan/20 bg-cyan/10 px-3 py-2 text-right shadow-glow">
        <div className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-[0.22em] text-cyan/80">
          <Sparkles className="h-3.5 w-3.5" />
          Confidence
        </div>
        <div className="mt-1 text-lg font-semibold text-white">
          {Math.round(meta.landmark_confidence * 100)}%
        </div>
      </div>
    </div>
  );
}
