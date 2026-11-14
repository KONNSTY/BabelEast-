"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVoicePipeline } from "@/hooks/useVoicePipeline";
import type { CoachReply } from "@/lib/coach";
import { useLearningStore } from "@/lib/learning-store";

export function VoiceCoachModal({ onClose, context }: { onClose: () => void; context?: string }) {
  const titleId = useId();
  const { speak, startListening, listening, transcript, setTranscript, supported } = useVoicePipeline("de-DE");
  const awardCoachXp = useLearningStore((state) => state.awardCoachXp);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const messageText = transcript || draft;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = messageText.trim();
    if (!message || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, targetLanguage: "de", context }),
      });
      const payload = (await response.json().catch(() => null)) as (CoachReply & { error?: string }) | null;
      if (response.status === 401) {
        setError("Melde dich an, damit der Coach dein Tageslimit prüfen kann.");
        return;
      }
      if (!response.ok || !payload || !payload.reply) {
        setError(payload?.error ?? "Der Coach antwortet gerade nicht.");
        return;
      }
      setReply(payload);
      awardCoachXp(payload.xp_earned);
      speak(payload.reply);
      setDraft("");
      setTranscript("");
    } catch {
      setError("Keine Verbindung. Versuch es noch einmal.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-black">
            Voice Coach
          </h2>
          <button type="button" onClick={onClose} className="touch-target text-slate-400">
            Schließen
          </button>
        </div>
        <p className="mb-5 text-slate-600">
          {supported ? "Sprich oder tippe. Der Coach antwortet auf Deutsch." : "Tippe deine Antwort. Dieser Browser hat keine Spracherkennung."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-bold text-slate-600" htmlFor="coach-message">
            Deine Nachricht
            <textarea
              id="coach-message"
              value={messageText}
              onChange={(event) => {
                setTranscript("");
                setDraft(event.target.value);
              }}
              rows={3}
              maxLength={1200}
              className="mt-2 w-full rounded-2xl border-2 border-slate-200 p-4 font-medium outline-none focus:border-sky-400"
              placeholder="Hallo! Ich heiße …"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={startListening} disabled={!supported || listening} className="flex-1">
              <Mic size={18} aria-hidden /> {listening ? "Ich höre zu …" : "Sprechen"}
            </Button>
            <Button type="submit" disabled={pending || messageText.trim().length === 0} className="flex-1">
              {pending ? "Sende …" : "Senden"}
            </Button>
          </div>
        </form>
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
            {error}{" "}
            {error.includes("Melde dich an") && (
              <Link href="/login" className="font-black underline">
                Zum Login
              </Link>
            )}
          </p>
        )}
        {reply && (
          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
            {reply.correction && <p className="text-sm font-bold text-amber-700">Korrektur: {reply.correction}</p>}
            <p className="font-medium">{reply.reply}</p>
            <p className="text-sm text-slate-500">{reply.explanation}</p>
          </div>
        )}
        <button type="button" className="mt-4 text-sm font-bold text-sky-700" onClick={() => speak("Hallo! Wie heißt du?")}>
          Begrüßung vorlesen
        </button>
      </div>
    </div>
  );
}
