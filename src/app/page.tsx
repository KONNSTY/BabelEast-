"use client";

import { useEffect, useState } from "react";
import { Headphones, Trophy } from "lucide-react";
import { MobileNav, type MobileNavId } from "@/components/MobileNav";
import { VoiceCoachModal } from "@/components/coach/VoiceCoachModal";
import { AppHeader } from "@/components/home/AppHeader";
import { LearnDashboard } from "@/components/home/LearnDashboard";
import { LessonSession } from "@/components/lesson/LessonSession";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { Button } from "@/components/ui/Button";
import { lessonById } from "@/lib/course";
import { useLearningStore } from "@/lib/learning-store";

export default function Home() {
  const hydrated = useLearningStore((state) => state.hydrated);
  const xp = useLearningStore((state) => state.xp);
  const hearts = useLearningStore((state) => state.hearts);
  const streak = useLearningStore((state) => state.streak);
  const [nav, setNav] = useState<MobileNavId>("learn");
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);

  useEffect(() => {
    void Promise.resolve(useLearningStore.persist.rehydrate()).finally(() => {
      useLearningStore.getState().syncHearts();
      useLearningStore.setState({ hydrated: true });
    });
  }, []);

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-canvas">
        <LoadingState label="Dein Lernstand wird geladen …" />
      </main>
    );
  }

  if (activeLesson) {
    const lesson = lessonById(activeLesson);
    return (
      <>
        <LessonSession lessonId={activeLesson} onExit={() => setActiveLesson(null)} onCoach={() => setShowCoach(true)} />
        {showCoach && <VoiceCoachModal context={lesson?.title} onClose={() => setShowCoach(false)} />}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-canvas pb-24 text-slate-900 lg:pb-0">
      <AppHeader xp={xp} hearts={hearts} streak={streak} />
      <MobileNav active={nav} onSelect={setNav} />
      {nav === "learn" && <LearnDashboard onStart={setActiveLesson} onCoach={() => setShowCoach(true)} />}
      {nav === "coach" && (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <EmptyState
            title="Voice Coach"
            message="Sprich oder tippe eine Nachricht. Ohne Konto antwortet der Coach nur lokal in der Entwicklung."
            icon={<Headphones size={26} aria-hidden />}
            action={<Button onClick={() => setShowCoach(true)}>Coach öffnen</Button>}
          />
        </div>
      )}
      {nav === "quests" && (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <EmptyState title="Tägliche Quests" message="Quests sind noch nicht gebaut. Dein Tagesziel auf der Lernseite zählt schon mit." icon={<Trophy size={26} aria-hidden />} />
        </div>
      )}
      {nav === "profile" && (
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          <EmptyState title="Profil" message="Profil und Konto folgen. Dein Fortschritt bleibt bis dahin auf diesem Gerät." />
        </div>
      )}
      {showCoach && <VoiceCoachModal onClose={() => setShowCoach(false)} />}
    </main>
  );
}
