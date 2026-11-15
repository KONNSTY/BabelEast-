import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DAILY_GOAL_MINUTES,
  MAX_HEARTS,
  MINUTES_PER_PASS,
  applyStreak,
  awardAnswer,
  lessonXp,
  localDate,
  regenHearts,
  scorePercent,
  hasPassed,
  type HeartState,
} from "@/lib/learning-rules";

export type LessonResult = {
  score: number;
  passed: boolean;
  xpEarned: number;
};

type PersistedLearning = HeartState & {
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  completedLessonIds: string[];
  replayRewardedOn: Record<string, string>;
  minutesToday: number;
  minutesDate: string | null;
  coachTurns: number;
  coachXpDate: string | null;
};

export type LearningState = PersistedLearning & {
  hydrated: boolean;
  syncHearts: (now?: number) => void;
  answerQuestion: (correct: boolean, now?: number) => boolean;
  finishLesson: (
    input: { lessonId: string; correct: number; total: number; xpReward: number },
    now?: Date,
  ) => LessonResult;
  awardCoachXp: (amount: number) => void;
};

export const initialLearningState: PersistedLearning = {
  xp: 0,
  hearts: MAX_HEARTS,
  lastRegenAt: null,
  streak: 0,
  lastActiveDate: null,
  completedLessonIds: [],
  replayRewardedOn: {},
  minutesToday: 0,
  minutesDate: null,
  coachTurns: 0,
  coachXpDate: null,
};

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function persistedFrom(value: unknown): PersistedLearning {
  if (!value || typeof value !== "object") return initialLearningState;
  const record = value as Partial<PersistedLearning>;
  const replayRewardedOn: Record<string, string> = {};
  if (record.replayRewardedOn && typeof record.replayRewardedOn === "object") {
    for (const [lessonId, day] of Object.entries(record.replayRewardedOn)) {
      if (typeof day === "string") replayRewardedOn[lessonId] = day;
    }
  }
  return {
    xp: finiteNumber(record.xp, 0, 0, Number.MAX_SAFE_INTEGER),
    hearts: finiteNumber(record.hearts, MAX_HEARTS, 0, MAX_HEARTS),
    lastRegenAt: typeof record.lastRegenAt === "string" ? record.lastRegenAt : null,
    streak: finiteNumber(record.streak, 0, 0, 10_000),
    lastActiveDate: typeof record.lastActiveDate === "string" ? record.lastActiveDate : null,
    completedLessonIds: Array.isArray(record.completedLessonIds) ? record.completedLessonIds.filter((id) => typeof id === "string") : [],
    replayRewardedOn,
    minutesToday: finiteNumber(record.minutesToday, 0, 0, 24 * 60),
    minutesDate: typeof record.minutesDate === "string" ? record.minutesDate : null,
    coachTurns: finiteNumber(record.coachTurns, 0, 0, 5),
    coachXpDate: typeof record.coachXpDate === "string" ? record.coachXpDate : null,
  };
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      ...initialLearningState,
      hydrated: false,
      syncHearts: (now = Date.now()) => {
        const next = regenHearts(get(), now);
        set(next);
      },
      answerQuestion: (correct, now = Date.now()) => {
        const awarded = awardAnswer(correct, get(), now);
        set({ ...awarded.hearts, xp: get().xp + awarded.xp });
        return awarded.accepted;
      },
      finishLesson: (input, now = new Date()) => {
        const today = localDate(now);
        const score = scorePercent(input.correct, input.total);
        const passed = hasPassed(score);
        const alreadyCompleted = get().completedLessonIds.includes(input.lessonId);
        const replay = !alreadyCompleted
          ? "first"
          : get().replayRewardedOn[input.lessonId] === today
            ? "replay-today"
            : "replay";
        const xpEarned = lessonXp(input.xpReward, score, replay);
        const streakUpdate = passed ? applyStreak(get().streak, get().lastActiveDate, today) : null;
        const minutesToday =
          (get().minutesDate === today ? get().minutesToday : 0) +
          (passed && replay !== "replay-today" ? MINUTES_PER_PASS : 0);
        set({
          xp: get().xp + xpEarned,
          streak: streakUpdate?.streak ?? get().streak,
          lastActiveDate: streakUpdate?.lastActiveDate ?? get().lastActiveDate,
          completedLessonIds:
            passed && !alreadyCompleted ? [...get().completedLessonIds, input.lessonId] : get().completedLessonIds,
          replayRewardedOn: xpEarned > 0 ? { ...get().replayRewardedOn, [input.lessonId]: today } : get().replayRewardedOn,
          minutesToday,
          minutesDate: today,
        });
        return { score, passed, xpEarned };
      },
      awardCoachXp: (amount) => {
        if (typeof amount !== "number" || !Number.isFinite(amount)) return;
        const xp = Math.max(0, Math.min(20, Math.round(amount)));
        if (xp === 0) return;
        const today = localDate(new Date());
        const turns = get().coachXpDate === today ? get().coachTurns : 0;
        if (turns >= 5) return;
        set({ xp: get().xp + xp, coachTurns: turns + 1, coachXpDate: today });
      },
    }),
    {
      name: "linguaflow-learning",
      version: 2,
      skipHydration: true,
      partialize: (state) => ({
        xp: state.xp,
        hearts: state.hearts,
        lastRegenAt: state.lastRegenAt,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        completedLessonIds: state.completedLessonIds,
        replayRewardedOn: state.replayRewardedOn,
        minutesToday: state.minutesToday,
        minutesDate: state.minutesDate,
        coachTurns: state.coachTurns,
        coachXpDate: state.coachXpDate,
      }),
      migrate: (persisted, version) => (version < 2 ? initialLearningState : persistedFrom(persisted)),
    },
  ),
);

export function dailyMinutes(state: Pick<LearningState, "minutesToday" | "minutesDate">, today = localDate(new Date())): number {
  return state.minutesDate === today ? state.minutesToday : 0;
}

export { DAILY_GOAL_MINUTES };
