"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPinned, Menu, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { AskPanel } from "@/components/AskPanel";
import { BottomSheet } from "@/components/BottomSheet";
import { CameraView } from "@/components/CameraView";
import { CaptureButton } from "@/components/CaptureButton";
import { CommunityCards } from "@/components/CommunityCards";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { ResultHeader } from "@/components/ResultHeader";
import { SourceChips } from "@/components/SourceChips";
import { StoryCards } from "@/components/StoryCards";
import { analyzePlace, detectPlace } from "@/lib/api";
import { AnalyzeResponse, AskResponse, Mode } from "@/lib/types";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { useSpeechOutput } from "@/hooks/useSpeechOutput";

const transparentPixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9nKPcAAAAASUVORK5CYII=";

export default function HomePage() {
  const sessionId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>("story");
  const [modePrompt, setModePrompt] = useState("");
  const [askQuery, setAskQuery] = useState("");
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "blocked">("idle");
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [locationState, setLocationState] = useState<"idle" | "ready" | "blocked">("idle");
  const [response, setResponse] = useState<AnalyzeResponse | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [currentPlace, setCurrentPlace] = useState<{
    name: string;
    neighborhood?: string | null;
    borough?: string | null;
  } | null>(null);
  const [responseVersion, setResponseVersion] = useState(0);
  const [isPending, startTransition] = useTransition();

  const {
    supported: voiceSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error: voiceError,
    start: startListening,
    stop: stopListening,
    clearTranscript,
  } = useSpeechInput({
    onFinalTranscript: (transcript) => {
      setAskQuery(transcript);
      handleAnalyze("ask", transcript);
    },
  });

  useSpeechOutput(askResponse?.answer, Boolean(askResponse));

  useEffect(() => {
    let active = true;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) {
          setCameraState("blocked");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("ready");
      } catch {
        if (active) {
          setCameraState("blocked");
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("blocked");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationState("ready");
      },
      () => {
        setLocationState("blocked");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  useEffect(() => {
    if (
      response &&
      response.type !== "clarification"
    ) {
      setCurrentPlace({
        name: response.landmark_name,
        neighborhood: response.meta.neighborhood,
        borough: response.meta.borough,
      });
    }
    if (response?.type === "ask") {
      setAskResponse(response);
    }
  }, [response]);

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!canvas) {
      return transparentPixel;
    }

    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
        setFrozenFrame(dataUrl);
        return dataUrl.split(",")[1];
      }
    }

    setFrozenFrame(`data:image/png;base64,${transparentPixel}`);
    return transparentPixel;
  }

  function runDetection(imageBase64: string, hint?: string) {
    setSheetOpen(true);
    setResponseVersion((value) => value + 1);

    startTransition(async () => {
      const result = await detectPlace({
        image_base64: imageBase64,
        query: hint || modePrompt || undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
        session_id: sessionId,
      });
      setResponse(result);
    });
  }

  function handleCapture() {
    const imageBase64 = captureFrame();
    if (!imageBase64) {
      return;
    }

    setCapturedImageBase64(imageBase64);
    setCurrentPlace(null);
    setResponse(null);
    setAskResponse(null);
    clearTranscript();
    runDetection(imageBase64);
  }

  function handleAnalyze(nextMode: Mode, nextQuery?: string) {
    if (!capturedImageBase64) {
      handleCapture();
      return;
    }

    setMode(nextMode);
    setResponseVersion((value) => value + 1);
    if (nextMode === "ask") {
      setAskResponse(null);
    }

    startTransition(async () => {
      const result = await analyzePlace({
        mode: nextMode,
        image_base64: capturedImageBase64,
        query:
          nextMode === "ask"
            ? nextQuery || askQuery.trim() || landmarkPrompt(nextMode)
            : nextQuery || modePrompt || landmarkPrompt(nextMode),
        latitude: coords.latitude,
        longitude: coords.longitude,
        session_id: sessionId,
      });
      setResponse(result);
    });
  }

  function resetToLiveView() {
    setFrozenFrame(null);
    setCapturedImageBase64(null);
    setCurrentPlace(null);
    setResponse(null);
    setAskResponse(null);
    setSheetOpen(false);
    setModePrompt("");
    setAskQuery("");
    clearTranscript();
  }

  function handleMicToggle() {
    if (!voiceSupported) {
      return;
    }

    if (!currentPlace) {
      return;
    }

    setMode("ask");

    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  }

  function handleStoryAskPrompt(query: string) {
    setAskQuery(query);
    handleAnalyze("ask", query);
  }

  const canChooseMode =
    response?.type === "detection_preview" ||
    response?.type === "ask" ||
    response?.type === "story" ||
    response?.type === "community";

  const hasDemoFallback =
    response?.type !== "clarification" &&
    response?.sources.some((source) => source.label === "Demo fallback");

  function renderResponseContent() {
    if (!response) {
      return (
        <div className="space-y-4 pt-2">
          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Scan The City</p>
            <p className="mt-3 text-sm leading-7 text-white/85">
              Open on the camera, capture a landmark, then choose how you want NYC Lens to interpret it.
            </p>
          </div>
        </div>
      );
    }

    if (response.type === "clarification") {
      return (
        <div className="space-y-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Clarify The View</p>
            <p className="mt-3 text-sm leading-7 text-white/88">{response.message}</p>
            {response.suggested_hint ? (
              <p className="mt-3 text-sm text-mist/70">{response.suggested_hint}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {response.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setModePrompt(option);
                  if (capturedImageBase64) {
                    runDetection(capturedImageBase64, option);
                  }
                }}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (response.type === "detection_preview") {
      return (
        <div className="space-y-5">
          <ResultHeader title={response.title} landmarkName={response.landmark_name} meta={response.meta} />
          <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.05] p-5 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Landmark Detected</p>
            <p className="mt-3 text-lg font-medium text-white">{response.subtitle}</p>
            <p className="mt-3 text-sm leading-7 text-white/84">{response.overview}</p>
          </div>
          <div className="rounded-[1.5rem] border border-cyan/15 bg-cyan/8 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan/80">Choose A Lens</p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Start with facts, switch into story, or reveal neighborhood context without recapturing the frame.
            </p>
          </div>
          <SourceChips sources={response.sources} />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <ResultHeader title={response.title} landmarkName={response.landmark_name} meta={response.meta} />
        {mode === "ask" && currentPlace ? (
          <AskPanel
            placeName={currentPlace.name}
            askQuery={askQuery}
            onAskQueryChange={setAskQuery}
            onSubmit={(value) => handleAnalyze("ask", value || askQuery)}
            onPromptPick={(value) => {
              setAskQuery(value);
              handleAnalyze("ask", value);
            }}
            onMicToggle={handleMicToggle}
            askResponse={askResponse}
            interimTranscript={interimTranscript}
            finalTranscript={finalTranscript}
            isListening={isListening}
            isLoading={isPending && mode === "ask"}
            voiceSupported={voiceSupported}
            voiceError={voiceError}
          />
        ) : null}
        {response.type === "story" ? (
          <StoryCards response={response} onAskPrompt={handleStoryAskPrompt} />
        ) : null}
        {response.type === "community" ? <CommunityCards response={response} /> : null}
        {response.type !== "ask" ? <SourceChips sources={response.sources} /> : null}
      </div>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-ink">
      <CameraView
        videoRef={videoRef}
        frozenFrame={frozenFrame}
        cameraState={cameraState}
        isAnalyzing={isPending}
      />

      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-x-0 bottom-[calc(42vh+1.75rem)] z-10 px-5">
        <div className="mx-auto max-w-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-white"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {canChooseMode ? (
              <ModeSwitcher value={mode} onChange={handleAnalyze} />
            ) : (
              <div className="glass flex-1 rounded-full border border-white/10 px-4 py-3 text-center text-xs uppercase tracking-[0.26em] text-mist/65">
                Capture First • Then Choose A Lens
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[max(env(safe-area-inset-bottom),1.5rem)] z-10 px-5">
        <div className="mx-auto flex max-w-sm items-end justify-between gap-4">
          <div className="w-16" />
          <CaptureButton onClick={handleCapture} disabled={isPending} />
          <div className="w-16" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[8.7rem] z-10 px-5">
        <div className="mx-auto max-w-sm space-y-2">
          {hasDemoFallback ? (
            <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-100">
              Demo Mode Fallback
            </div>
          ) : null}
          {currentPlace ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[1.35rem] border border-cyan/15 px-4 py-3 shadow-card"
            >
              <div className="flex items-center gap-2 text-cyan/85">
                <MapPinned className="h-4 w-4" />
                <p className="text-[11px] uppercase tracking-[0.24em]">Current Place</p>
              </div>
              <p className="mt-2 text-sm font-medium text-white">{currentPlace.name}</p>
              <p className="mt-1 text-xs text-mist/70">
                {[currentPlace.neighborhood, currentPlace.borough].filter(Boolean).join(" • ") || "Active session landmark"}
              </p>
            </motion.div>
          ) : null}
          <div className="glass rounded-[1.65rem] border border-white/10 p-3 shadow-card">
            <div className="flex items-center gap-2 text-cyan/80">
              <Sparkles className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-[0.26em]">
                {currentPlace && mode === "ask"
                  ? "Ask Mode Ready"
                  : currentPlace
                    ? "Prompt The Current Frame"
                    : capturedImageBase64
                      ? "Prompt The Current Frame"
                      : "Optional Detection Hint"}
              </p>
            </div>
            <p className="mt-2 text-xs text-mist/55">
              {locationState === "ready"
                ? "Location is available for nearby landmark fallback."
                : "Location is unavailable, so detection will rely on the camera frame and typed hints only."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={modePrompt}
                onChange={(event) => setModePrompt(event.target.value)}
                placeholder={
                  currentPlace
                    ? mode === "ask"
                      ? "Switch to Ask panel below to type or speak"
                      : mode === "story"
                      ? `Add a storytelling angle for ${currentPlace.name}`
                      : mode === "community"
                        ? `Ask what matters around ${currentPlace.name}`
                        : `Place detected: switch to Ask below`
                    : "Type a landmark name, sign, or neighborhood"
                }
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-mist/40"
                disabled={Boolean(currentPlace && mode === "ask")}
              />
              <button
                type="button"
                onClick={() => {
                  if (capturedImageBase64 && canChooseMode && mode !== "ask") {
                    handleAnalyze(mode);
                  } else if (capturedImageBase64) {
                    runDetection(capturedImageBase64);
                  } else {
                    handleCapture();
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/15 text-cyan"
                aria-label="Analyze current view"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomSheet open={sheetOpen} title={response?.type === "detection_preview" ? "detected" : mode}>
        <AnimatePresence mode="wait">
          <motion.div
            key={
              response
                ? `${response.type}-${response.type === "clarification" ? "clarify" : response.landmark_name}-${responseVersion}-${askQuery}-${finalTranscript}-${interimTranscript}`
                : `empty-${responseVersion}`
            }
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {renderResponseContent()}
          </motion.div>
        </AnimatePresence>
      </BottomSheet>

      <AnimatePresence>{isPending ? <LoadingOverlay /> : null}</AnimatePresence>

      {frozenFrame ? (
        <button
          type="button"
          onClick={resetToLiveView}
          className="absolute right-5 top-[max(env(safe-area-inset-top),1.25rem)] z-20 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.25em] text-mist/65"
        >
          Live View
        </button>
      ) : null}
    </main>
  );
}

function landmarkPrompt(mode: Mode) {
  if (mode === "ask") {
    return "What is this place and why is it important?";
  }
  if (mode === "story") {
    return "Tell this place as a cinematic NYC story.";
  }
  return "Explain why this area matters to residents.";
}
