"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: null | (() => void);
  onresult: null | ((event: any) => void);
  onerror: null | ((event: any) => void);
  onend: null | (() => void);
  start: () => void;
  stop: () => void;
};

type UseSpeechInputOptions = {
  onFinalTranscript?: (transcript: string) => void;
};

export function useSpeechInput({ onFinalTranscript }: UseSpeechInputOptions = {}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalTranscriptRef = useRef<UseSpeechInputOptions["onFinalTranscript"]>(onFinalTranscript);
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    const browserWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    const Recognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let nextFinal = "";
      let nextInterim = "";

      for (const result of Array.from(event.results) as any[]) {
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          nextFinal += `${text} `;
        } else {
          nextInterim += `${text} `;
        }
      }

      const normalizedFinal = nextFinal.trim();
      const normalizedInterim = nextInterim.trim();

      if (normalizedFinal) {
        setFinalTranscript(normalizedFinal);
        onFinalTranscriptRef.current?.(normalizedFinal);
      }
      setInterimTranscript(normalizedInterim);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was denied."
          : "Voice input failed. Try again.",
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.stop?.();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    setInterimTranscript("");
    setFinalTranscript("");
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (error) {
      setIsListening(false);
      setError(
        error instanceof Error
          ? error.message
          : "Could not start voice input. Try tapping the mic again.",
      );
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const clearTranscript = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
  }, []);

  return {
    supported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    start,
    stop,
    clearTranscript,
  };
}
