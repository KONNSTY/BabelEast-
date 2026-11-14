import { describe, expect, it } from "vitest";
import { courseProgress, lessonStatuses, lessons } from "./course";

describe("course path", () => {
  it("keeps answers out of the prompt and inside the options", () => {
    for (const lesson of lessons) {
      expect(lesson.questions.length).toBeGreaterThan(0);
      for (const question of lesson.questions) {
        expect(question.options).toContain(question.answer);
        expect(question.prompt).not.toContain(question.answer);
      }
    }
  });

  it("unlocks the next lesson only after the current one is completed", () => {
    expect(lessonStatuses([])).toMatchObject({ greetings: "current", people: "locked", cafe: "locked", review: "locked" });
    expect(lessonStatuses(["greetings"])).toMatchObject({ greetings: "done", people: "current", cafe: "locked" });
    expect(courseProgress(["greetings", "people"])).toBe(50);
  });
});
