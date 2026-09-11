"use client";
import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, Headphones, Lock, Mic, Sparkles, Trophy, Volume2, Zap } from "lucide-react";
import { useLearningStore } from "@/lib/learning-store";
import { useVoicePipeline } from "@/hooks/useVoicePipeline";
import { Button } from "@/components/ui/Button";
import { Heartbar } from "@/components/Heartbar";
import { StreakBadge } from "@/components/StreakBadge";
import { XpBar } from "@/components/XpBar";
import { MobileNav, type MobileNavId } from "@/components/MobileNav";
import { EmptyState } from "@/components/states/EmptyState";

const lessons = [
  { id: "greetings", title: "Begrüßungen", subtitle: "Hallo sagen und sich vorstellen", xp: 35, status: "done" },
  { id: "people", title: "Menschen & Namen", subtitle: "Über dich und andere sprechen", xp: 40, status: "current" },
  { id: "cafe", title: "Im Café", subtitle: "Bestellen mit Selbstvertrauen", xp: 45, status: "locked" },
  { id: "review", title: "Wochenreview", subtitle: "Alles festigen", xp: 60, status: "locked" },
];
const questions = [
  { prompt: "Wie sagt man ‘Guten Morgen’ auf Deutsch?", answer: "Guten Morgen", options: ["Guten Morgen", "Gute Nacht", "Bis später", "Danke"] },
  { prompt: "Wähle den passenden Satz:", answer: "Ich heiße Maya.", options: ["Ich bin heißen Maya.", "Ich heiße Maya.", "Maya ich Name.", "Heiße ich bin Maya."] },
  { prompt: "Übersetze: ‘Nice to meet you.’", answer: "Freut mich, dich kennenzulernen.", options: ["Wie geht es dir?", "Freut mich, dich kennenzulernen.", "Bis morgen!", "Guten Appetit!"] },
];

function VoiceCoachModal({ onClose }: { onClose: () => void }) {
  const { speak, startListening, listening, transcript, supported: voiceSupported } = useVoicePipeline("de-DE");
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 p-5" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">Voice Coach</h2>
          <button onClick={onClose} className="touch-target text-slate-400" aria-label="Schließen">
            Schließen
          </button>
        </div>
        <p className="mb-5 text-slate-600">
          {voiceSupported
            ? "Starte ein kurzes Gespräch. Du kannst jederzeit tippen, falls Spracheingabe gerade nicht klappt."
            : "Dein Browser unterstützt keine Spracherkennung — tippe deine Antwort stattdessen ein."}
        </p>
        <Button
          onClick={() => {
            startListening();
            speak("Hallo! Wie heißt du?");
          }}
          className="w-full"
        >
          <Mic size={18} aria-hidden /> Gespräch starten
        </Button>
        {transcript && <p className="mt-5 rounded-2xl bg-slate-50 p-4 font-medium">{transcript}</p>}
        {listening && <p className="mt-2 text-sm font-bold text-brand">Ich höre zu …</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [nav, setNav] = useState<MobileNavId>("learn");
  const { xp, hearts, streak, answerQuestion, finishLesson } = useLearningStore();
  const { speak } = useVoicePipeline("de-DE");
  const question = questions[questionIndex];
  const progress = useMemo(() => Math.round((questionIndex / questions.length) * 100), [questionIndex]);

  const chooseAnswer = (option: string) => {
    if (selected) return;
    setSelected(option);
    answerQuestion(option === question.answer);
    window.setTimeout(() => {
      if (questionIndex === questions.length - 1) {
        finishLesson(35);
        setCompleted(true);
      } else {
        setQuestionIndex((value) => value + 1);
        setSelected(null);
      }
    }, 650);
  };

  const header = (
    <nav className="border-b border-sky-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
            <Sparkles size={20} />
          </div>
          <span className="text-xl font-black tracking-tight">
            lingua<span className="text-brand">flow</span>
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <StreakBadge days={streak} />
          <Heartbar hearts={hearts} />
          <span className="hidden items-center gap-1 font-black text-cyan-600 sm:flex">
            <Zap size={18} fill="currentColor" aria-hidden /> {xp} XP
          </span>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">M</div>
        </div>
      </div>
    </nav>
  );

  if (activeLesson && !completed) {
    return (
      <main className="min-h-screen bg-canvas text-slate-900">
        <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
          <div className="mb-12 flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={() => setActiveLesson(null)}>
              Beenden
            </Button>
            <XpBar current={questionIndex} goal={questions.length} className="flex-1" />
            <span className="font-bold text-slate-500">
              {questionIndex + 1}/{questions.length}
            </span>
          </div>
          <section className="rounded-[2rem] bg-white p-7 shadow-xl shadow-sky-100 sm:p-12">
            <div className="mb-10 flex items-center justify-between">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-600">Wortschatz</span>
              <button onClick={() => speak(question.prompt)} aria-label="Frage vorlesen" className="touch-target rounded-full bg-sky-50 p-3 text-sky-600">
                <Volume2 size={20} />
              </button>
            </div>
            <h1 className="mb-10 text-3xl font-black leading-tight sm:text-4xl">{question.prompt}</h1>
            <div className="grid gap-3">
              {question.options.map((option) => {
                const correct = selected && option === question.answer;
                const wrong = selected === option && option !== question.answer;
                return (
                  <button
                    key={option}
                    onClick={() => chooseAnswer(option)}
                    className={`touch-target rounded-2xl border-2 p-4 text-left font-bold transition-all ${
                      correct
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : wrong
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-slate-200 hover:border-sky-400 hover:bg-sky-50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="mt-10 border-t border-slate-100 pt-6">
              <button onClick={() => setShowCoach(true)} className="touch-target flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-sky-600">
                <Mic size={17} /> Mit Coach üben
              </button>
            </div>
          </section>
        </div>
        {showCoach && <VoiceCoachModal onClose={() => setShowCoach(false)} />}
      </main>
    );
  }

  if (completed) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5">
        <section className="w-full max-w-lg rounded-[2rem] bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <Trophy size={40} />
          </div>
          <p className="mb-2 font-black uppercase tracking-widest text-success">Lesson geschafft</p>
          <h1 className="mb-3 text-4xl font-black">Starker Lauf.</h1>
          <p className="mb-8 text-slate-500">Du hast heute gelernt und deine Serie geschützt.</p>
          <div className="mb-8 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-sky-50 p-4">
              <b className="block text-2xl text-brand">+35</b>
              <span className="text-xs font-bold text-slate-500">XP</span>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <b className="block text-2xl text-orange-500">{streak}</b>
              <span className="text-xs font-bold text-slate-500">Tage</span>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <b className="block text-2xl text-success">100%</b>
              <span className="text-xs font-bold text-slate-500">Fokus</span>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              setCompleted(false);
              setActiveLesson(null);
              setQuestionIndex(0);
              setSelected(null);
            }}
          >
            Zur Übersicht
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas pb-24 text-slate-900 lg:pb-0">
      {header}
      {nav === "learn" && (
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-8 rounded-[2rem] bg-brand-shadow p-7 text-white shadow-xl shadow-sky-200 sm:p-9">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-2 text-sm font-bold text-sky-100">DEIN DEUTSCHKURS · A1</p>
                  <h1 className="text-3xl font-black sm:text-4xl">
                    Kleine Schritte.
                    <br />
                    Echte Gespräche.
                  </h1>
                  <p className="mt-4 max-w-md text-sky-100">Heute reichen 10 Minuten, um deine Serie zu halten.</p>
                </div>
                <div className="hidden rounded-2xl bg-white/15 p-4 sm:block">
                  <BookOpen size={30} />
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <XpBar current={38} goal={100} trackClassName="bg-white/20" barClassName="bg-white" className="flex-1" />
                <span className="text-sm font-black">38%</span>
              </div>
            </div>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Dein Lernpfad</h2>
                <p className="text-sm font-medium text-slate-500">Unit 1 · Erste Gespräche</p>
              </div>
              <button className="touch-target text-sm font-black text-brand">Alle Units</button>
            </div>
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ${lesson.status === "current" ? "ring-2 ring-sky-400" : ""}`}
                >
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${
                      lesson.status === "done" ? "bg-emerald-100 text-emerald-600" : lesson.status === "current" ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {lesson.status === "done" ? <Check /> : lesson.status === "locked" ? <Lock size={20} /> : <span className="text-xl font-black">{index + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black">{lesson.title}</h3>
                      {lesson.status === "current" && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase text-sky-600">Als Nächstes</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{lesson.subtitle}</p>
                  </div>
                  <div className="text-right">
                    {lesson.status === "locked" ? (
                      <span className="text-sm font-bold text-slate-300">{lesson.xp} XP</span>
                    ) : (
                      <Button
                        size="sm"
                        variant={lesson.status === "current" ? "primary" : "secondary"}
                        onClick={() => lesson.status !== "done" && setActiveLesson(lesson.id)}
                      >
                        {lesson.status === "done" ? "Nochmal" : "Start"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2 text-orange-500">
                  <StreakBadge days={streak} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{streak} Tage</p>
                  <p className="text-sm font-medium text-slate-500">Deine Serie lebt!</p>
                </div>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Mo</span>
                <span>Di</span>
                <span>Mi</span>
                <span>Do</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>So</span>
              </div>
              <div className="mt-3 flex justify-between">
                {[1, 1, 1, 1, 0, 0, 0].map((done, i) => (
                  <div key={i} className={`h-7 w-7 rounded-full ${done ? "bg-orange-400" : "bg-slate-100"}`} />
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black">Tagesziel</h3>
                <span className="text-sm font-black text-brand">6/10 min</span>
              </div>
              <XpBar current={6} goal={10} barClassName="bg-success" />
              <p className="mt-4 text-sm text-slate-500">Noch eine Lesson und du hast es geschafft.</p>
            </div>
            <button onClick={() => setShowCoach(true)} className="touch-target flex w-full items-center gap-4 rounded-3xl bg-slate-900 p-5 text-left text-white shadow-lg">
              <div className="rounded-2xl bg-white/10 p-3">
                <Headphones />
              </div>
              <div className="flex-1">
                <p className="font-black">Voice Coach</p>
                <p className="text-sm text-slate-400">Übe einen echten Dialog</p>
              </div>
              <ChevronRight size={20} />
            </button>
          </aside>
        </div>
      )}
      {nav === "coach" && (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <EmptyState
            title="Voice Coach"
            message="Öffne den Coach über den Button unten, um einen Dialog zu üben."
            icon={<Headphones size={26} aria-hidden />}
            action={<Button onClick={() => setShowCoach(true)}>Coach öffnen</Button>}
          />
        </div>
      )}
      {nav === "quests" && (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <EmptyState title="Tägliche Quests" message="Quests sind noch nicht implementiert — dieser Bereich folgt in einem späteren Milestone." icon={<Trophy size={26} aria-hidden />} />
        </div>
      )}
      {nav === "profile" && (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <EmptyState title="Profil" message="Profilverwaltung ist noch nicht implementiert — dieser Bereich folgt in einem späteren Milestone." />
        </div>
      )}
      {showCoach && <VoiceCoachModal onClose={() => setShowCoach(false)} />}
      <MobileNav active={nav} onSelect={setNav} />
    </main>
  );
}
