"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComicStrip } from "@/components/ComicStrip";
import { ComicEra, StoryPanel, StoryResponse } from "@/lib/types";

type StoryCardsProps = {
  response: StoryResponse;
  onAskPrompt: (query: string) => void;
};

type StoryScene = {
  id: "past" | "present" | "future";
  title: string;
  kicker: string;
  text: string;
  prompt: string;
  accent: string;
};

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clampIndex(index: number, size: number) {
  return Math.max(0, Math.min(index, size - 1));
}

export function StoryCards({ response, onAskPrompt }: StoryCardsProps) {
  const scenes = useMemo<StoryScene[]>(
    () => [
      {
        id: "past",
        title: "Past",
        kicker: "How the story begins",
        text: response.story.past,
        prompt: `What was happening at ${response.landmark_name} in its early history?`,
        accent: "from-cyan/20 via-sky-400/10 to-transparent",
      },
      {
        id: "present",
        title: "Present",
        kicker: "What the place feels like now",
        text: response.story.present,
        prompt: `Why does ${response.landmark_name} still matter today?`,
        accent: "from-white/16 via-cyan/10 to-transparent",
      },
      {
        id: "future",
        title: "Future",
        kicker: "Where the city might carry it next",
        text: response.story.future,
        prompt: `What could the future of ${response.landmark_name} look like?`,
        accent: "from-cyan/20 via-indigo-400/10 to-transparent",
      },
    ],
    [response.landmark_name, response.story.future, response.story.past, response.story.present],
  );
  const contextPanels = useMemo(
    () => response.story_panels.filter((panel) => panel.kind !== "narrative"),
    [response.story_panels],
  );

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [autoNarration, setAutoNarration] = useState(true);
  const [revealedSentenceCount, setRevealedSentenceCount] = useState(0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(0);
  const [showContextSheet, setShowContextSheet] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sceneKeyRef = useRef("");
  const storyExperienceRef = useRef<HTMLDivElement | null>(null);

  const currentScene = scenes[currentSceneIndex];
  const sentences = useMemo(() => splitIntoSentences(currentScene.text), [currentScene.text]);
  const sceneCompletion = sentences.length
    ? Math.min(revealedSentenceCount / sentences.length, 1)
    : 0;

  const stopNarration = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    utteranceRef.current = null;
    window.speechSynthesis.cancel();
  };

  const pauseNarration = () => {
    setIsPlaying(false);
    stopNarration();
  };

  const startNarration = () => {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      isMuted ||
      !currentScene.text
    ) {
      return;
    }

    stopNarration();

    const utterance = new SpeechSynthesisUtterance(
      `Let me show you the story of this place. ${currentScene.title}. ${currentScene.text}`,
    );
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    utterance.onboundary = (event) => {
      if (event.name && event.name !== "word" && event.name !== "sentence") {
        return;
      }

      const sceneText = `${currentScene.title}. ${currentScene.text}`;
      const spokenSoFar = sceneText.slice(0, event.charIndex);
      const spokenSentenceCount = splitIntoSentences(spokenSoFar).length;
      const nextIndex = clampIndex(Math.max(spokenSentenceCount - 1, 0), sentences.length || 1);
      setActiveSentenceIndex(nextIndex);
      setRevealedSentenceCount((count) =>
        Math.max(count, Math.min(spokenSentenceCount, sentences.length)),
      );
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setActiveSentenceIndex(null);
      setRevealedSentenceCount(sentences.length);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveSentenceIndex(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const sceneKey = `${response.landmark_name}-${currentScene.id}`;
    if (sceneKeyRef.current === sceneKey) {
      return;
    }

    sceneKeyRef.current = sceneKey;
    setRevealedSentenceCount(0);
    setActiveSentenceIndex(0);
    setShowContextSheet(false);
    stopNarration();

    if (!sentences.length) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(autoNarration && !isMuted);
  }, [autoNarration, currentScene.id, isMuted, response.landmark_name, sentences.length]);

  useEffect(() => {
    if (!sentences.length) {
      return;
    }

    if (!isPlaying) {
      stopNarration();
      return;
    }

    startNarration();
    return () => {
      stopNarration();
    };
  }, [autoNarration, currentScene.text, isMuted, isPlaying, sentences.length]);

  useEffect(() => {
    if (!sentences.length) {
      return;
    }

    if (!isPlaying) {
      return;
    }

    const interval = window.setInterval(() => {
      setRevealedSentenceCount((count) => {
        if (count >= sentences.length) {
          window.clearInterval(interval);
          return count;
        }
        return count + 1;
      });
    }, 1150);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPlaying, sentences.length, currentScene.id]);

  useEffect(() => {
    return () => {
      stopNarration();
    };
  }, []);

  const goToScene = (nextIndex: number) => {
    setCurrentSceneIndex(clampIndex(nextIndex, scenes.length));
  };

  const focusScene = (sceneId: ComicEra) => {
    const nextIndex = scenes.findIndex((scene) => scene.id === sceneId);
    if (nextIndex === -1) {
      return;
    }
    goToScene(nextIndex);
    requestAnimationFrame(() => {
      storyExperienceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleReplay = () => {
    setRevealedSentenceCount(0);
    setActiveSentenceIndex(0);
    setIsPlaying(true);
  };

  const handleSceneTap = () => {
    if (isPlaying) {
      pauseNarration();
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) {
      return;
    }

    const delta = event.changedTouches[0]?.clientX - touchStartX;
    if (Math.abs(delta) > 40) {
      if (delta < 0) {
        goToScene(currentSceneIndex + 1);
      } else {
        goToScene(currentSceneIndex - 1);
      }
    }
    setTouchStartX(null);
  };

  return (
    <div className="space-y-4">
      <div
        ref={storyExperienceRef}
        className="story-atmosphere relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,28,0.98),rgba(6,9,19,0.98))] p-5 shadow-card"
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${currentScene.accent}`} />
        <div className="pointer-events-none absolute inset-x-6 top-5 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />
        <div className="story-shimmer pointer-events-none absolute -right-16 top-10 h-40 w-40 rounded-full bg-cyan/10 blur-3xl" />
        <div className="story-drift pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-cyan/80">Story Mode</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
              {currentScene.title}
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-mist/70">{currentScene.kicker}</p>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-black/30 px-3 py-2 text-right backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan/80">Scene</p>
            <p className="mt-1 text-sm text-white">
              {currentSceneIndex + 1} / {scenes.length}
            </p>
          </div>
        </div>

        <div
          className="relative z-10 mt-5 overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5"
          onClick={handleSceneTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mb-4 flex items-center gap-2 text-cyan/80">
            <Waves className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.28em]">Guided Tour</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="min-h-[15rem]"
            >
              <div className="space-y-4">
                {sentences.map((sentence, index) => {
                  const isVisible = index < revealedSentenceCount;
                  const isActive = activeSentenceIndex === index && isPlaying;

                  return (
                    <motion.p
                      key={`${currentScene.id}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: isVisible ? 1 : 0.18,
                        y: isVisible ? 0 : 8,
                      }}
                      transition={{ duration: 0.36, ease: "easeOut" }}
                      className={`text-[15px] leading-8 transition ${
                        isActive
                          ? "text-white drop-shadow-[0_0_18px_rgba(101,224,255,0.24)]"
                          : isVisible
                            ? "text-white/90"
                            : "text-white/35"
                      }`}
                    >
                      {sentence}
                    </motion.p>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 rounded-[1.35rem] border border-cyan/12 bg-cyan/8 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan/80">Progress</p>
                <p className="mt-1 text-sm text-white/82">
                  {isPlaying
                    ? "Narration is moving through this scene."
                    : "Tap play to resume the guided tour."}
                </p>
              </div>
              <div className="text-sm text-white/72">{Math.round(sceneCompletion * 100)}%</div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(101,224,255,0.95),rgba(76,167,255,0.72))]"
                animate={{ width: `${sceneCompletion * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onAskPrompt(currentScene.prompt)}
            className="rounded-[1.3rem] border border-cyan/20 bg-cyan/10 px-4 py-4 text-left text-sm text-white transition hover:bg-cyan/14"
          >
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan/80">Explore More</p>
            <p className="mt-2 font-medium">Ask about this moment</p>
            <p className="mt-1 text-white/68">{currentScene.prompt}</p>
          </button>

          <button
            type="button"
            onClick={() => setShowContextSheet((value) => !value)}
            className="rounded-[1.3rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-left text-sm text-white transition hover:bg-white/[0.07]"
          >
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan/80">Story Atlas</p>
            <p className="mt-2 font-medium">Open the hidden civic notes</p>
            <p className="mt-1 text-white/68">
              Reveal the context panels behind this scene and follow the city thread deeper.
            </p>
          </button>
        </div>

        <AnimatePresence>
          {showContextSheet ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative z-10 mt-4 space-y-3"
            >
              {contextPanels.map((panel: StoryPanel, index) => (
                <motion.div
                  key={`${panel.title}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center gap-2 text-cyan/80">
                    <Compass className="h-4 w-4" />
                    <p className="text-[10px] uppercase tracking-[0.24em]">{panel.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/82">{panel.body}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <ComicStrip
        landmarkName={response.landmark_name}
        story={response.story}
        borough={response.meta.borough}
        neighborhood={response.meta.neighborhood}
        activePanelId={currentScene.id}
        isNarrating={isPlaying}
        onSelect={focusScene}
      />

      <div className="glass sticky bottom-0 z-10 flex items-center gap-2 rounded-[1.7rem] border border-white/10 px-3 py-3 shadow-card">
        <button
          type="button"
          onClick={() => {
            if (isPlaying) {
              pauseNarration();
            } else {
              setIsPlaying(true);
            }
          }}
          className="flex h-12 min-w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
          aria-label={isPlaying ? "Pause narration" : "Play narration"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={handleReplay}
          className="flex h-12 min-w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
          aria-label="Restart scene narration"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsMuted((value) => !value);
            setIsPlaying(false);
          }}
          className="flex h-12 min-w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white"
          aria-label={isMuted ? "Unmute narration" : "Mute narration"}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setAutoNarration((value) => !value)}
          className={`rounded-full px-4 py-3 text-xs uppercase tracking-[0.22em] transition ${
            autoNarration
              ? "bg-cyan/15 text-cyan"
              : "border border-white/10 bg-white/[0.04] text-mist/70"
          }`}
        >
          Auto Voice
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToScene(currentSceneIndex - 1)}
            disabled={currentSceneIndex === 0}
            className="flex h-12 min-w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white disabled:opacity-35"
            aria-label="Previous scene"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToScene(currentSceneIndex + 1)}
            disabled={currentSceneIndex === scenes.length - 1}
            className="flex h-12 min-w-12 items-center justify-center rounded-full bg-cyan px-4 text-sm font-medium text-slate-950 disabled:opacity-35"
            aria-label="Next scene"
          >
            <span className="mr-2 hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
