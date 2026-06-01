import { EventEmitter } from "events";

// Persist across Next.js hot reloads in dev
const g = global as typeof globalThis & { __appEmitter?: EventEmitter };
if (!g.__appEmitter) {
  g.__appEmitter = new EventEmitter();
  g.__appEmitter.setMaxListeners(200);
}

export const appEmitter = g.__appEmitter;

export type AppEvent = { type: "songs" } | { type: "moods" } | { type: "chat"; userId: string };

export function emitChange(event: AppEvent) {
  appEmitter.emit("change", event);
}
