import { beforeEach, describe, expect, it } from "vitest";
import { initialLearningState, useLearningStore } from "./learning-store";

beforeEach(() => {
  useLearningStore.setState({ ...initialLearningState, hydrated: true, replayRewardedOn: {} });
});

describe("learning store", () => {
  it("tracks hearts and XP from real answers", () => {
    expect(useLearningStore.getState().answerQuestion(false, Date.parse("2026-11-14T12:00:00.000Z"))).toBe(true);
    expect(useLearningStore.getState().hearts).toBe(4);
    expect(useLearningStore.getState().xp).toBe(0);
    useLearningStore.getState().answerQuestion(true, Date.parse("2026-11-14T12:00:00.000Z"));
    expect(useLearningStore.getState().xp).toBe(10);
    expect(useLearningStore.getState().hearts).toBe(4);
  });

  it("blocks practice at zero hearts", () => {
    useLearningStore.setState({ hearts: 0, lastRegenAt: "2026-11-14T12:00:00.000Z" });
    expect(useLearningStore.getState().answerQuestion(true, Date.parse("2026-11-14T12:30:00.000Z"))).toBe(false);
    expect(useLearningStore.getState().xp).toBe(0);
  });

  it("completes a passing lesson once and keeps the same-day streak", () => {
    const first = useLearningStore.getState().finishLesson(
      { lessonId: "greetings", correct: 3, total: 3, xpReward: 35 },
      new Date(2026, 10, 14, 9),
    );
    const replay = useLearningStore.getState().finishLesson(
      { lessonId: "greetings", correct: 3, total: 3, xpReward: 35 },
      new Date(2026, 10, 14, 18),
    );
    expect(first).toMatchObject({ passed: true, xpEarned: 35, score: 100 });
    expect(replay.xpEarned).toBe(0);
    expect(useLearningStore.getState().completedLessonIds).toEqual(["greetings"]);
    expect(useLearningStore.getState().streak).toBe(1);
    expect(useLearningStore.getState().minutesToday).toBe(4);
  });

  it("does not complete or pay a failed lesson", () => {
    const result = useLearningStore.getState().finishLesson(
      { lessonId: "people", correct: 0, total: 3, xpReward: 40 },
      new Date(2026, 10, 14, 9),
    );
    expect(result.passed).toBe(false);
    expect(result.xpEarned).toBe(0);
    expect(useLearningStore.getState().completedLessonIds).toEqual([]);
    expect(useLearningStore.getState().streak).toBe(0);
  });

  it("ignores a non-numeric coach reward", () => {
    useLearningStore.getState().awardCoachXp(Number.NaN);
    expect(useLearningStore.getState().xp).toBe(0);
    useLearningStore.getState().awardCoachXp(5);
    expect(useLearningStore.getState().xp).toBe(5);
  });
});
