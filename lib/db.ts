/**
 * This application's database.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, and how the schema has changed
 * over time.
 */
import { defineDatabase } from "@/lib/storage/database";

export type Session = {
  id: string;
  /** Completed focus session or finished break; the timer records which. */
  kind: "focus" | "break";
  /** The local calendar date the session finished on, as `YYYY-MM-DD` — the daily counts key on it. */
  day: string;
  /** Epoch millis when the session ended. */
  completedAt: number;
};

/** A single named setting, e.g. the visitor's chime mute choice. */
export type Setting = {
  key: string;
  value: string;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{ sessions: Session; settings: Setting }>({
  name: "focus-timer",
  versions: [
    // Only the primary key and the properties queried on: sessions are counted by `day`, settings
    // are looked up by `key`, and nothing else is ever filtered or sorted by.
    { version: 1, stores: { sessions: "id, day, completedAt", settings: "key" } },
  ],
});
