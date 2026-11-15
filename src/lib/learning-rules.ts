export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 4 * 60 * 60 * 1000;
export const XP_CORRECT = 10;
export const XP_WRONG = 0;
export const PASSING_SCORE = 60;
export const DAILY_GOAL_MINUTES = 10;
export const MINUTES_PER_PASS = 4;

export type HeartState = {
  hearts: number;
  lastRegenAt: string | null;
};

export function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(earlier: string, later: string): number {
  const [fromYear, fromMonth, fromDay] = earlier.split("-").map(Number);
  const [toYear, toMonth, toDay] = later.split("-").map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((to - from) / 86_400_000);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

export function scorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
}

export function hasPassed(score: number): boolean {
  return score >= PASSING_SCORE;
}

function safeReward(reward: number): number {
  if (!Number.isFinite(reward)) return 0;
  return Math.max(0, Math.min(200, Math.floor(reward)));
}

export function lessonXp(reward: number, score: number, replay: "first" | "replay" | "replay-today"): number {
  const bounded = safeReward(reward);
  if (!hasPassed(score)) return 0;
  if (replay === "first") return bounded;
  if (replay === "replay-today") return 0;
  return Math.max(1, Math.floor(bounded / 4));
}

function boundedHearts(hearts: number): number {
  if (!Number.isFinite(hearts)) return MAX_HEARTS;
  return Math.max(0, Math.min(MAX_HEARTS, Math.floor(hearts)));
}

export function regenHearts(state: HeartState, now: number): HeartState {
  const hearts = boundedHearts(state.hearts);
  if (!Number.isFinite(now) || hearts >= MAX_HEARTS || !state.lastRegenAt) {
    return { hearts, lastRegenAt: hearts >= MAX_HEARTS ? null : state.lastRegenAt };
  }
  const started = Date.parse(state.lastRegenAt);
  if (!Number.isFinite(started) || started > now) return { hearts, lastRegenAt: state.lastRegenAt };
  const intervals = Math.floor((now - started) / HEART_REGEN_MS);
  if (intervals <= 0) return { hearts, lastRegenAt: state.lastRegenAt };
  const restored = Math.min(MAX_HEARTS, hearts + intervals);
  if (restored >= MAX_HEARTS) return { hearts: restored, lastRegenAt: null };
  return { hearts: restored, lastRegenAt: new Date(started + intervals * HEART_REGEN_MS).toISOString() };
}

export function spendHeart(state: HeartState, now: number): HeartState & { spent: boolean } {
  const synced = regenHearts(state, now);
  if (synced.hearts <= 0) return { ...synced, spent: false };
  return {
    hearts: synced.hearts - 1,
    lastRegenAt: synced.hearts >= MAX_HEARTS ? new Date(now).toISOString() : synced.lastRegenAt,
    spent: true,
  };
}

export function nextHeartAt(state: HeartState): number | null {
  if (state.hearts >= MAX_HEARTS || !state.lastRegenAt) return null;
  return Date.parse(state.lastRegenAt) + HEART_REGEN_MS;
}

export function applyStreak(streak: number, lastActiveDate: string | null, today: string): { streak: number; lastActiveDate: string } {
  if (lastActiveDate === today) return { streak, lastActiveDate: today };
  if (lastActiveDate && daysBetween(lastActiveDate, today) === 1) {
    return { streak: streak + 1, lastActiveDate: today };
  }
  return { streak: 1, lastActiveDate: today };
}

export function isDateInStreak(day: string, streak: number, lastActiveDate: string | null): boolean {
  if (!lastActiveDate || streak <= 0) return false;
  const start = addDays(lastActiveDate, -(streak - 1));
  return day >= start && day <= lastActiveDate;
}

export function currentWeekDates(today: string): string[] {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return Array.from({ length: 7 }, (_, index) => addDays(today, mondayOffset + index));
}

export function awardAnswer(correct: boolean, state: HeartState, now: number): { hearts: HeartState; xp: number; accepted: boolean } {
  const synced = regenHearts(state, now);
  if (synced.hearts <= 0) return { hearts: synced, xp: 0, accepted: false };
  if (!correct) {
    const spent = spendHeart(synced, now);
    return { hearts: spent, xp: XP_WRONG, accepted: spent.spent };
  }
  return { hearts: synced, xp: XP_CORRECT, accepted: true };
}
