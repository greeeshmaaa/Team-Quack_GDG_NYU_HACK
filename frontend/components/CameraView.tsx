"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CameraOff, MapPinned, ScanSearch } from "lucide-react";
import { RefObject } from "react";

type CameraViewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  frozenFrame: string | null;
  cameraState: "idle" | "ready" | "blocked";
  isAnalyzing: boolean;
};

export function CameraView({
  videoRef,
  frozenFrame,
  cameraState,
  isAnalyzing,
}: CameraViewProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(98,173,255,0.25),transparent_25%),linear-gradient(180deg,rgba(5,8,15,0.15),rgba(4,5,10,0.9))]" />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          frozenFrame ? "opacity-0" : cameraState === "ready" ? "opacity-100" : "opacity-20"
        }`}
      />

      {frozenFrame ? (
        <img
          src={frozenFrame}
          alt="Captured city frame"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="soft-grid absolute inset-0 opacity-30" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-black/45 to-transparent" />

      <div className="pointer-events-none absolute inset-x-6 top-[18%] flex items-center justify-center">
        <div className="relative h-[42vh] w-full max-w-sm rounded-[2.6rem] border border-white/12 bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="absolute left-3 top-3 h-10 w-10 rounded-tl-[1.2rem] border-l border-t border-cyan/80" />
          <div className="absolute right-3 top-3 h-10 w-10 rounded-tr-[1.2rem] border-r border-t border-cyan/80" />
          <div className="absolute bottom-3 left-3 h-10 w-10 rounded-bl-[1.2rem] border-b border-l border-cyan/80" />
          <div className="absolute bottom-3 right-3 h-10 w-10 rounded-br-[1.2rem] border-b border-r border-cyan/80" />
          <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
          <div className="absolute left-1/2 top-10 w-px -translate-x-1/2 bg-gradient-to-b from-cyan/40 to-transparent h-20" />
        </div>
      </div>

      <div className="absolute left-5 right-5 top-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="mx-auto max-w-sm">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-mist/70 backdrop-blur-xl">
            <MapPinned className="h-3.5 w-3.5" />
            NYC Lens
          </div>
          <h1 className="max-w-xs text-4xl font-semibold leading-[0.92] tracking-[-0.04em] text-white">
            Point at NYC. Let the city speak back.
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-mist/70">
            Capture a place. Reveal its facts, story, and civic meaning.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {cameraState === "blocked" ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute inset-x-5 top-[calc(50%-3rem)] mx-auto max-w-sm rounded-[1.75rem] border border-white/10 bg-black/55 p-5 backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/8 p-3">
                <CameraOff className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Camera unavailable</p>
                <p className="mt-1 text-sm leading-6 text-mist/70">
                  The app can still run in demo mode while you wire permissions or test on mobile Safari/Chrome.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isAnalyzing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
              className="mb-5 rounded-full border border-cyan/30 bg-cyan/10 p-4 shadow-glow"
            >
              <ScanSearch className="h-8 w-8 text-cyan" />
            </motion.div>
            <p className="text-base font-medium text-white">Analyzing the cityscape...</p>
            <p className="mt-2 text-sm text-mist/70">Framing landmark, context, and civic story</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
