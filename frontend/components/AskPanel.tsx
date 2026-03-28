"use client";

import { LoaderCircle } from "lucide-react";
import { AskResponse } from "@/lib/types";
import { AskCard } from "@/components/AskCard";
import { FollowupChips } from "@/components/FollowupChips";
import { MicButton } from "@/components/MicButton";
import { SourceChips } from "@/components/SourceChips";

type AskPanelProps = {
  placeName: string;
  askQuery: string;
  onAskQueryChange: (value: string) => void;
  onSubmit: (query?: string) => void;
  onPromptPick: (value: string) => void;
  onMicToggle: () => void;
  askResponse: AskResponse | null;
  interimTranscript: string;
  finalTranscript: string;
  isListening: boolean;
  isLoading: boolean;
  voiceSupported: boolean;
  voiceError: string | null;
};

export function AskPanel({
  placeName,
  askQuery,
  onAskQueryChange,
  onSubmit,
  onPromptPick,
  onMicToggle,
  askResponse,
  interimTranscript,
  finalTranscript,
  isListening,
  isLoading,
  voiceSupported,
  voiceError,
}: AskPanelProps) {
  return (
    <div className="space-y-5">
      {voiceError ? (
        <div className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {voiceError}
        </div>
      ) : null}

      {!voiceSupported ? (
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-mist/75">
          Voice input is unavailable in this browser.
        </div>
      ) : null}

      <div className="glass flex items-center justify-between rounded-[1.65rem] border border-white/10 p-4 shadow-card">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Ask About This Place</p>
          <p className="mt-2 text-sm leading-6 text-white/84">
            Tap the mic and ask about {placeName}.
          </p>
        </div>
        {isLoading ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 text-cyan">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <MicButton active={isListening} onToggle={onMicToggle} />
        )}
      </div>

      {askResponse ? (
        <>
          <AskCard response={askResponse} />
          <FollowupChips onPick={onPromptPick} />
          <SourceChips sources={askResponse.sources} />
        </>
      ) : (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan/80">Ready To Ask</p>
          <p className="mt-3 text-sm leading-7 text-white/84">
            Try “What is this place?”, “Why is it important?”, or “When was it built?”
          </p>
        </div>
      )}
    </div>
  );
}
