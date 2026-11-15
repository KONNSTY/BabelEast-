import { get, set } from "idb-keyval";

export type SyncEvent = {
  id: string;
  kind: "lesson_completed" | "answer";
  payload: Record<string, unknown>;
  createdAt: string;
};

const KEY = "linguaflow-sync-queue";
const MAX_QUEUE = 50;

export async function queueSyncEvent(event: Omit<SyncEvent, "id" | "createdAt">): Promise<void> {
  const queue = (await get<SyncEvent[]>(KEY)) ?? [];
  queue.push({ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  await set(KEY, queue.slice(-MAX_QUEUE));
}

export async function flushSyncQueue(send: (event: SyncEvent) => Promise<void>): Promise<{ sent: number; pending: number }> {
  const queue = (await get<SyncEvent[]>(KEY)) ?? [];
  const failed: SyncEvent[] = [];
  for (const event of queue) {
    try {
      await send(event);
    } catch {
      failed.push(event);
    }
  }
  await set(KEY, failed);
  return { sent: queue.length - failed.length, pending: failed.length };
}
