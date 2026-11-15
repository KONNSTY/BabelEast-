import { describe, expect, it } from "vitest";
import {
  HEART_REGEN_MS,
  MAX_HEARTS,
  XP_CORRECT,
  addDays,
  applyStreak,
  awardAnswer,
  currentWeekDates,
  hasPassed,
  isDateInStreak,
  lessonXp,
  regenHearts,
  scorePercent,
  spendHeart,
} from "./learning-rules";

const NOW = Date.parse("2026-11-14T12:00:00.000Z");

describe("learning rules", () => {
  it("floors hearts at zero and refuses answers without a heart", () => {
    const empty = { hearts: 0, lastRegenAt: new Date(NOW).toISOString() };
    const blocked = awardAnswer(false, empty, NOW);
    expect(blocked.accepted).toBe(false);
    expect(blocked.hearts.hearts).toBe(0);
    expect(blocked.xp).toBe(0);

    const spent = spendHeart({ hearts: 1, lastRegenAt: new Date(NOW - 1000).toISOString() }, NOW);
    expect(spent).toMatchObject({ hearts: 0, spent: true });
    const second = spendHeart({ hearts: 0, lastRegenAt: spent.lastRegenAt }, NOW);
    expect(second.hearts).toBe(0);
    expect(second.spent).toBe(false);
  });

  it("awards XP only for an accepted correct answer", () => {
    const correct = awardAnswer(true, { hearts: MAX_HEARTS, lastRegenAt: null }, NOW);
    const wrong = awardAnswer(false, { hearts: MAX_HEARTS, lastRegenAt: null }, NOW);
    expect(correct.xp).toBe(XP_CORRECT);
    expect(correct.hearts.hearts).toBe(MAX_HEARTS);
    expect(wrong.xp).toBe(0);
    expect(wrong.hearts.hearts).toBe(MAX_HEARTS - 1);
    expect(wrong.hearts.lastRegenAt).toBe(new Date(NOW).toISOString());
  });

  it("regenerates one heart per four hours and stops at five", () => {
    const started = new Date(NOW - 8 * 60 * 60 * 1000).toISOString();
    const restored = regenHearts({ hearts: 3, lastRegenAt: started }, NOW);
    expect(restored.hearts).toBe(5);
    expect(restored.lastRegenAt).toBeNull();

    const partial = regenHearts({ hearts: 1, lastRegenAt: new Date(NOW - HEART_REGEN_MS).toISOString() }, NOW);
    expect(partial.hearts).toBe(2);
    expect(regenHearts({ hearts: Number.NaN, lastRegenAt: "not-a-date" }, NOW).hearts).toBe(MAX_HEARTS);
    expect(regenHearts({ hearts: 2, lastRegenAt: "not-a-date" }, NOW)).toEqual({ hearts: 2, lastRegenAt: "not-a-date" });
  });

  it("scores a lesson and pays full XP once, then a reduced replay on a later day", () => {
    expect(scorePercent(2, 3)).toBe(67);
    expect(hasPassed(59)).toBe(false);
    expect(hasPassed(60)).toBe(true);
    expect(lessonXp(40, 40, "first")).toBe(0);
    expect(lessonXp(40, 100, "first")).toBe(40);
    expect(lessonXp(40, 100, "replay-today")).toBe(0);
    expect(lessonXp(40, 100, "replay")).toBe(10);
    expect(lessonXp(-10, 100, "first")).toBe(0);
  });

  it("increments a streak once per day and resets after a gap", () => {
    const first = applyStreak(0, null, "2026-11-13");
    const sameDay = applyStreak(first.streak, first.lastActiveDate, "2026-11-13");
    const nextDay = applyStreak(sameDay.streak, sameDay.lastActiveDate, "2026-11-14");
    const skipped = applyStreak(nextDay.streak, nextDay.lastActiveDate, "2026-11-16");
    expect(first).toEqual({ streak: 1, lastActiveDate: "2026-11-13" });
    expect(sameDay.streak).toBe(1);
    expect(nextDay.streak).toBe(2);
    expect(skipped).toEqual({ streak: 1, lastActiveDate: "2026-11-16" });
    expect(isDateInStreak("2026-11-14", 2, "2026-11-14")).toBe(true);
    expect(isDateInStreak("2026-11-12", 2, "2026-11-14")).toBe(false);
  });

  it("builds the Monday-first week that contains a date", () => {
    expect(currentWeekDates("2026-11-14")).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(addDays("2026-11-14", 1)).toBe("2026-11-15");
  });
});
