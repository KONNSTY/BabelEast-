"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Trophy, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Heartbar } from "@/components/Heartbar";
import { XpBar } from "@/components/XpBar";
import { lessonById } from "@/lib/course";
import { nextHeartAt } from "@/lib/learning-rules";
import { useLearningStore, type LessonResult } from "@/lib/learning-store";
import { queueSyncEvent } from "@/lib/offline-sync";

function formatWait(timestamp: number, now: number): string {
  const minutes = Math.max(1, Math.ceil((timestamp - now) / 60000));
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} Std.`;
}

export function LessonSession({
  lessonId,
  onExit,
  onCoach,
}: {
  lessonId: string;
  onExit: () => void;
  onCoach: () => void;
}) {
  const lesson = lessonById(lessonId);
  const hearts = useLearningStore((state) => state.hearts);
  const lastRegenAt = useLearningStore((state) => state.lastRegenAt);
  const streak = useLearningStore((state) => state.streak);
  const answerQuestion = useLearningStore((state) => state.answerQuestion);
  const finishLesson = useLearningStore((state) => state.finishLesson);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!result?.passed) return;
    void import("canvas-confetti").then(({ default: launch }) => {
      void launch({ particleCount: 80, spread: 60, origin: { y: 0.7 }, disableForReducedMotion: true });
    });
  }, [result]);

  if (!lesson) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5">
        <Button onClick={onExit}>Zur Übersicht</Button>
      </main>
    );
  }

  const question = lesson.questions[index];
  const regenAt = nextHeartAt({ hearts, lastRegenAt });

  const chooseAnswer = (option: string) => {
    if (selected || hearts <= 0) return;
    const correct = option === question.answer;
    const accepted = answerQuestion(correct);
    if (!accepted) return;
    setSelected(option);
    const nextCorrect = correctCount + (correct ? 1 : 0);
    if (correct) setCorrectCount(nextCorrect);
    timer.current = window.setTimeout(() => {
      if (index === lesson.questions.length - 1) {
        const lessonResult = finishLesson({
          lessonId: lesson.id,
          correct: nextCorrect,
          total: lesson.questions.length,
          xpReward: lesson.xp,
        });
        setResult(lessonResult);
        void queueSyncEvent({
          kind: "lesson_completed",
          payload: { lessonId: lesson.id, score: lessonResult.score, passed: lessonResult.passed },
        }).catch(() => undefined);
      } else {
        setIndex((value) => value + 1);
        setSelected(null);
      }
    }, 650);
  };

  if (result) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5">
        <section className="w-full max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-xl">
          <div className={`mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full ${result.passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
            <Trophy size={40} aria-hidden />
          </div>
          <p className={`mb-2 font-black uppercase tracking-widest ${result.passed ? "text-success" : "text-amber-600"}`}>
            {result.passed ? "Lektion geschafft" : "Noch nicht bestanden"}
          </p>
          <h1 className="mb-3 text-4xl font-black">{result.passed ? "Starker Lauf." : `${result.score}%`}</h1>
          <p className="mb-8 text-slate-500">
            {result.passed ? "Bestanden ab 60%. Deine Serie zählt diesen Tag." : "Zum Bestehen brauchst du mindestens 60%."}
          </p>
          <div className="mb-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-sky-50 p-4">
              <b className="block text-2xl text-brand">+{result.xpEarned}</b>
              <span className="text-xs font-bold text-slate-500">XP</span>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <b className="block text-2xl text-orange-500">{streak}</b>
              <span className="text-xs font-bold text-slate-500">Tage</span>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <b className="block text-2xl text-success">{result.score}%</b>
              <span className="text-xs font-bold text-slate-500">Treffer</span>
            </div>
          </div>
          <Button className="w-full" onClick={onExit}>
            Zur Übersicht
          </Button>
        </section>
      </main>
    );
  }

  if (hearts <= 0) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5">
        <section className="w-full max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-xl">
          <Heartbar hearts={0} className="mb-6 justify-center" />
          <h1 className="mb-3 text-3xl font-black">Keine Herzen mehr.</h1>
          <p className="mb-8 text-slate-500">
            {regenAt ? `Das nächste Herz ist in etwa ${formatWait(regenAt, now)} wieder da.` : "Warte, bis sich ein Herz regeneriert."}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              useLearningStore.getState().syncHearts();
              setNow(Date.now());
            }}
          >
            Stand prüfen
          </Button>
          <Button className="mt-3 w-full" onClick={onExit}>
            Zur Übersicht
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-slate-900">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        <div className="mb-12 flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onExit}>
            Beenden
          </Button>
          <XpBar current={index} goal={lesson.questions.length} label={`Frage ${index + 1} von ${lesson.questions.length}`} className="flex-1" />
          <Heartbar hearts={hearts} />
        </div>
        <section className="rounded-[2rem] bg-white p-7 shadow-xl shadow-sky-100 sm:p-12">
          <div className="mb-10 flex items-center justify-between">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-600">{lesson.title}</span>
            <SpeakButton text={question.prompt} />
          </div>
          <h1 className="mb-10 text-3xl font-black leading-tight sm:text-4xl">{question.prompt}</h1>
          <div className="grid gap-3">
            {question.options.map((option) => {
              const correct = selected !== null && option === question.answer;
              const wrong = selected === option && option !== question.answer;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseAnswer(option)}
                  disabled={selected !== null}
                  aria-pressed={selected === option}
                  className={`touch-target rounded-2xl border-2 p-4 text-left font-bold transition-all ${
                    correct ? "border-emerald-500 bg-emerald-50 text-emerald-700" : wrong ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 hover:border-sky-400 hover:bg-sky-50"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6">
            <button type="button" onClick={onCoach} className="touch-target flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-sky-600">
              <Mic size={17} aria-hidden /> Mit Coach üben
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function SpeakButton({ text }: { text: string }) {
  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };
  return (
    <button type="button" onClick={speak} aria-label="Frage vorlesen" className="touch-target rounded-full bg-sky-50 p-3 text-sky-600">
      <Volume2 size={20} aria-hidden />
    </button>
  );
}
