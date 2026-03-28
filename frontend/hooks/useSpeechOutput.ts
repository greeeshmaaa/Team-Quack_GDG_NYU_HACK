"use client";

import { useEffect } from "react";

export function useSpeechOutput(text: string | null | undefined, enabled = true) {
  useEffect(() => {
    if (!enabled || !text) {
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [enabled, text]);
}
