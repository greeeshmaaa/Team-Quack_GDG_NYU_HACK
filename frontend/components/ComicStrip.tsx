"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Radio } from "lucide-react";
import { generateComicStrip } from "@/lib/api";
import { ComicEra, StoryBlock } from "@/lib/types";

type ComicStripProps = {
  landmarkName: string;
  story: StoryBlock;
  borough?: string | null;
  neighborhood?: string | null;
  activePanelId?: ComicEra;
  isNarrating?: boolean;
  onSelect: (panelId: ComicEra) => void;
};

type RenderPanel = {
  era: ComicEra;
  label: "PAST" | "PRESENT" | "FUTURE";
  caption: string;
  imageSrc: string;
  usedFallback: boolean;
  error?: string | null;
};

const panelOrder: ComicEra[] = ["past", "present", "future"];
const COMIC_STRIP_CACHE_PREFIX = "nyc-lens-comic-strip";

function toDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizeCaption(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "A new frame from the city story.";
  }
  if (collapsed.length <= 74) {
    return collapsed;
  }

  const clipped = collapsed.slice(0, 71).trimEnd();
  const safe = clipped.includes(" ") ? clipped.slice(0, clipped.lastIndexOf(" ")) : clipped;
  return `${safe.trimEnd()}...`;
}

function buildFallbackImage(
  era: ComicEra,
  label: string,
  landmarkName: string,
  caption: string,
) {
  const palette = {
    past: ["#1a2335", "#4b7ca7", "#f6d28f"],
    present: ["#111827", "#2b90d9", "#8ce3ff"],
    future: ["#0d1324", "#1d4ed8", "#9ef7d5"],
  }[era];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="55%" stop-color="${palette[1]}"/>
          <stop offset="100%" stop-color="${palette[2]}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="1000" rx="44" fill="url(#bg)"/>
      <rect x="44" y="44" width="712" height="912" rx="34" fill="rgba(6,10,18,0.26)" stroke="rgba(255,255,255,0.16)" stroke-width="4"/>
      <path d="M90 720 C210 590, 320 520, 400 430 C520 300, 645 260, 720 180" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="9" stroke-dasharray="18 16"/>
      <rect x="110" y="116" width="164" height="44" rx="22" fill="rgba(255,255,255,0.15)"/>
      <text x="192" y="145" fill="white" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" letter-spacing="5">${label}</text>
      <text x="110" y="260" fill="white" font-size="52" font-weight="700" font-family="Arial, sans-serif">${landmarkName}</text>
      <text x="110" y="320" fill="rgba(255,255,255,0.82)" font-size="28" font-family="Arial, sans-serif">Illustrated fallback panel</text>
      <foreignObject x="110" y="680" width="560" height="170">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color: rgba(255,255,255,0.92); font-family: Arial, sans-serif; font-size: 28px; line-height: 1.35;">
          ${caption}
        </div>
      </foreignObject>
    </svg>
  `;

  return toDataUrl(svg);
}

function buildLoadingImage(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
      <rect width="800" height="1000" rx="44" fill="#0b1220"/>
      <rect x="54" y="54" width="692" height="892" rx="36" fill="#111827" stroke="rgba(255,255,255,0.12)" stroke-width="4"/>
      <rect x="110" y="118" width="180" height="42" rx="21" fill="rgba(255,255,255,0.14)"/>
      <text x="200" y="145" fill="rgba(255,255,255,0.88)" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" letter-spacing="5">${label}</text>
      <rect x="110" y="226" width="500" height="26" rx="13" fill="rgba(255,255,255,0.12)"/>
      <rect x="110" y="274" width="430" height="26" rx="13" fill="rgba(255,255,255,0.08)"/>
      <rect x="110" y="672" width="520" height="22" rx="11" fill="rgba(255,255,255,0.12)"/>
      <rect x="110" y="712" width="360" height="22" rx="11" fill="rgba(255,255,255,0.08)"/>
      <circle cx="672" cy="190" r="28" fill="rgba(140,227,255,0.2)"/>
    </svg>
  `;

  return toDataUrl(svg);
}

export function ComicStrip({
  landmarkName,
  story,
  borough,
  neighborhood,
  activePanelId,
  isNarrating = false,
  onSelect,
}: ComicStripProps) {
  const [panels, setPanels] = useState<RenderPanel[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cacheKey = useMemo(
    () =>
      [
        COMIC_STRIP_CACHE_PREFIX,
        landmarkName,
        borough ?? "",
        neighborhood ?? "",
        story.past,
        story.present,
        story.future,
      ].join("::"),
    [borough, landmarkName, neighborhood, story.future, story.past, story.present],
  );

  const loadingPanels = useMemo<RenderPanel[]>(
    () =>
      panelOrder.map((era) => ({
        era,
        label: era.toUpperCase() as RenderPanel["label"],
        caption: "Rendering an illustrated story frame...",
        imageSrc: buildLoadingImage(era.toUpperCase()),
        usedFallback: true,
      })),
    [],
  );

  useEffect(() => {
    let isActive = true;

    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as RenderPanel[];
          if (parsed.length) {
            setPanels(parsed);
            setErrorMessage(
              parsed.find((panel) => panel.error)?.error ??
                (parsed.some((panel) => panel.usedFallback)
                  ? "Using cached illustrated panels."
                  : null),
            );
            setStatus(parsed.some((panel) => panel.usedFallback) ? "error" : "ready");
            return () => {
              isActive = false;
            };
          }
        } catch {
          window.sessionStorage.removeItem(cacheKey);
        }
      }
    }

    setStatus("loading");
    setErrorMessage(null);
    setPanels(loadingPanels);

    generateComicStrip({
      landmark_name: landmarkName,
      story,
      borough,
      neighborhood,
    })
      .then((response) => {
        if (!isActive) {
          return;
        }

        const mappedPanels = panelOrder.map((era) => {
          const remote = response.panels.find((panel) => panel.era === era);
          const label = (remote?.label ?? era.toUpperCase()) as RenderPanel["label"];
          const caption = normalizeCaption(
            remote?.caption ?? story[era as keyof StoryBlock] ?? "A new frame from the city story.",
          );

          return {
            era,
            label,
            caption,
            imageSrc:
              remote?.image_data_url ??
              buildFallbackImage(era, label, landmarkName, caption),
            usedFallback: remote?.used_fallback ?? true,
            error: remote?.error,
          };
        });

        setPanels(mappedPanels);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(mappedPanels));
        }
        setErrorMessage(
          mappedPanels.find((panel) => panel.error)?.error ??
            (mappedPanels.some((panel) => panel.usedFallback)
              ? "Image generation fell back to illustrated placeholders."
              : null),
        );
        setStatus(mappedPanels.some((panel) => panel.usedFallback) ? "error" : "ready");
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Image generation failed";
        console.error("Comic strip generation failed:", error);

        const fallbackPanels = panelOrder.map((era) => {
            const label = era.toUpperCase() as RenderPanel["label"];
            const caption = normalizeCaption(story[era as keyof StoryBlock] ?? "");

            return {
              era,
              label,
              caption,
              imageSrc: buildFallbackImage(era, label, landmarkName, caption),
              usedFallback: true,
              error: message,
            };
          });
        setPanels(fallbackPanels);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(fallbackPanels));
        }
        setErrorMessage(message);
        setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [borough, cacheKey, landmarkName, loadingPanels, neighborhood, story]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Comic Strip Mode</p>
          <h4 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">
            AI-generated visual frames of the story
          </h4>
          {errorMessage ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-white/68">
          <ImageIcon className="h-3.5 w-3.5 text-cyan/80" />
          {status === "loading"
            ? "Generating panels"
            : status === "error"
              ? "Fallback panels active"
              : "Panels ready"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {panels.map((panel, index) => {
          const isActive = panel.era === activePanelId;

          return (
            <motion.button
              key={`${landmarkName}-${panel.era}`}
              type="button"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.34, ease: "easeOut" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(panel.era)}
              className={`group overflow-hidden rounded-[1.7rem] border text-left shadow-card transition ${
                isActive
                  ? "border-cyan/40 bg-white/[0.05] shadow-[0_0_0_1px_rgba(101,224,255,0.24),0_20px_50px_rgba(9,27,51,0.48)]"
                  : "border-white/10 bg-black/20 hover:border-cyan/28"
              }`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-slate-950">
                <img
                  src={panel.imageSrc}
                  alt={`${panel.label} comic illustration of ${landmarkName}`}
                  className={`h-full w-full object-cover transition duration-500 ${status === "loading" ? "animate-pulse" : "group-hover:scale-[1.03]"}`}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full border border-white/14 bg-black/45 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.28em] text-white backdrop-blur">
                  {panel.label}
                </div>
                {isActive && isNarrating ? (
                  <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-cyan/25 bg-cyan/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan backdrop-blur">
                    <Radio className="h-3 w-3" />
                    Now Narrating
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 border-t border-white/10 bg-[linear-gradient(180deg,rgba(6,9,19,0.96),rgba(10,15,28,0.98))] px-4 py-4">
                <p className="truncate text-sm font-medium leading-6 text-white" title={panel.caption}>
                  {panel.caption}
                </p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                  {panel.usedFallback ? "Tap to refocus the story above" : "Tap to jump to this scene"}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
