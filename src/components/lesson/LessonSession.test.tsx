import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { initialLearningState, useLearningStore } from "@/lib/learning-store";
import { LessonSession } from "./LessonSession";

beforeEach(() => {
  useLearningStore.setState({ ...initialLearningState, hydrated: true, replayRewardedOn: {} });
});

describe("lesson answers", () => {
  it("spends one heart when two options are chosen in the same turn", () => {
    render(<LessonSession lessonId="greetings" onExit={() => undefined} onCoach={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Gute Nacht" }));
    fireEvent.click(screen.getByRole("button", { name: "Bis später" }));
    expect(useLearningStore.getState().hearts).toBe(4);
    expect(useLearningStore.getState().xp).toBe(0);
  });
});
