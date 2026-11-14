"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type RecognitionWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

function recognitionConstructor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const host = window as RecognitionWindow;
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function useVoicePipeline(locale: string) {
  const recognition = useRef<Recognition | null>(null);
  const mounted = useRef(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported] = useState(() => Boolean(recognitionConstructor()));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recognition.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    const Ctor = recognitionConstructor();
    if (!Ctor) return;
    recognition.current?.stop();
    const instance = new Ctor();
    instance.lang = locale;
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event) => {
      if (!mounted.current) return;
      setTranscript(Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(""));
    };
    instance.onerror = () => {
      if (mounted.current) setListening(false);
    };
    instance.onend = () => {
      if (mounted.current) setListening(false);
    };
    recognition.current = instance;
    setTranscript("");
    setListening(true);
    instance.start();
  }, [locale]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    },
    [locale],
  );

  return {
    startListening,
    stopListening: () => recognition.current?.stop(),
    speak,
    listening,
    transcript,
    setTranscript,
    supported,
  };
}
