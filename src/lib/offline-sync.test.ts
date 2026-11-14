import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, unknown>();

vi.mock("idb-keyval", () => ({
  get: async (key: string) => memory.get(key),
  set: async (key: string, value: unknown) => {
    memory.set(key, value);
  },
}));

import { flushSyncQueue, queueSyncEvent } from "./offline-sync";

beforeEach(() => {
  memory.clear();
});

describe("offline sync queue", () => {
  it("keeps events that fail to send and drops the ones that succeed", async () => {
    await queueSyncEvent({ kind: "answer", payload: { correct: true } });
    await queueSyncEvent({ kind: "lesson_completed", payload: { lessonId: "greetings" } });
    const result = await flushSyncQueue(async (event) => {
      if (event.kind === "answer") throw new Error("offline");
    });
    expect(result).toEqual({ sent: 1, pending: 1 });
    const second = await flushSyncQueue(async () => undefined);
    expect(second).toEqual({ sent: 1, pending: 0 });
  });
});
