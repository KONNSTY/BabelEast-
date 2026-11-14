import { BookOpen, Check, ChevronRight, Headphones, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StreakBadge } from "@/components/StreakBadge";
import { XpBar } from "@/components/XpBar";
import { courseProgress, lessonStatuses, lessons } from "@/lib/course";
import { DAILY_GOAL_MINUTES, currentWeekDates, isDateInStreak, localDate } from "@/lib/learning-rules";
import { dailyMinutes, useLearningStore } from "@/lib/learning-store";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function LearnDashboard({ onStart, onCoach }: { onStart: (lessonId: string) => void; onCoach: () => void }) {
  const { xp, streak, lastActiveDate, completedLessonIds, minutesToday, minutesDate } = useLearningStore();
  const statuses = lessonStatuses(completedLessonIds);
  const progress = courseProgress(completedLessonIds);
  const today = localDate(new Date());
  const minutes = dailyMinutes({ minutesToday, minutesDate }, today);
  const week = currentWeekDates(today);

  return (
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
              <p className="mt-4 max-w-md text-sky-100">
                {streak > 0 ? `Deine Serie steht bei ${streak} ${streak === 1 ? "Tag" : "Tagen"}.` : "Schließe heute eine Lektion ab, um deine Serie zu starten."}
              </p>
            </div>
            <div className="hidden rounded-2xl bg-white/15 p-4 sm:block">
              <BookOpen size={30} aria-hidden />
            </div>
          </div>
          <div className="mt-8 flex items-center gap-3">
            <XpBar current={progress} goal={100} label={`${progress} Prozent des A1-Pfads`} trackClassName="bg-white/20" barClassName="bg-white" className="flex-1" />
            <span className="text-sm font-black">{progress}%</span>
          </div>
        </div>
        <div className="mb-5">
          <h2 className="text-2xl font-black">Dein Lernpfad</h2>
          <p className="text-sm font-medium text-slate-500">Unit 1 · Erste Gespräche · {xp} XP auf diesem Gerät</p>
        </div>
        <div className="space-y-4">
          {lessons.map((lesson, index) => {
            const status = statuses[lesson.id];
            return (
              <div key={lesson.id} className={`flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ${status === "current" ? "ring-2 ring-sky-400" : ""}`}>
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${
                    status === "done" ? "bg-emerald-100 text-emerald-600" : status === "current" ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {status === "done" ? <Check aria-hidden /> : status === "locked" ? <Lock size={20} aria-hidden /> : <span className="text-xl font-black">{index + 1}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black">{lesson.title}</h3>
                    {status === "current" && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase text-sky-600">Als Nächstes</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">{lesson.subtitle}</p>
                </div>
                <div className="text-right">
                  {status === "locked" ? (
                    <span className="text-sm font-bold text-slate-300">{lesson.xp} XP</span>
                  ) : (
                    <Button size="sm" variant={status === "current" ? "primary" : "secondary"} onClick={() => onStart(lesson.id)}>
                      {status === "done" ? "Nochmal" : "Start"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <aside className="space-y-5">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <StreakBadge days={streak} />
            <div>
              <p className="text-2xl font-black">{streak} {streak === 1 ? "Tag" : "Tage"}</p>
              <p className="text-sm font-medium text-slate-500">{streak > 0 ? "Deine Serie lebt." : "Noch keine Serie."}</p>
            </div>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            {week.map((day) => {
              const active = isDateInStreak(day, streak, lastActiveDate);
              return <div key={day} className={`h-7 w-7 rounded-full ${active ? "bg-orange-400" : "bg-slate-100"}`} title={day} />;
            })}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black">Tagesziel</h3>
            <span className="text-sm font-black text-brand">
              {Math.min(minutes, DAILY_GOAL_MINUTES)}/{DAILY_GOAL_MINUTES} min
            </span>
          </div>
          <XpBar current={minutes} goal={DAILY_GOAL_MINUTES} label={`${minutes} von ${DAILY_GOAL_MINUTES} Minuten heute`} barClassName="bg-success" />
          <p className="mt-4 text-sm text-slate-500">
            {minutes >= DAILY_GOAL_MINUTES ? "Tagesziel erreicht." : "Eine bestandene Lektion zählt vier Minuten."}
          </p>
        </div>
        <button type="button" onClick={onCoach} className="touch-target flex w-full items-center gap-4 rounded-3xl bg-slate-900 p-5 text-left text-white shadow-lg">
          <div className="rounded-2xl bg-white/10 p-3">
            <Headphones aria-hidden />
          </div>
          <div className="flex-1">
            <p className="font-black">Voice Coach</p>
            <p className="text-sm text-slate-400">Übe einen echten Dialog</p>
          </div>
          <ChevronRight size={20} aria-hidden />
        </button>
      </aside>
    </div>
  );
}
