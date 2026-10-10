/**
 * Queries over the sessions table. Components call these, never Dexie directly.
 *
 * A "day" is the visitor's local calendar date, stored as a `YYYY-MM-DD` string when the session
 * finishes, so a day that crosses midnight or a daylight-saving shift counts exactly once.
 */
import { database, newId, type Session } from "@/lib/db";

const sessions = async () => (await database.ready()).sessions;

/** The local calendar date at a given instant, as `YYYY-MM-DD`. */
export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Record a finished session. The day is taken from the completion time, never passed in. */
export async function recordSession(kind: Session["kind"], completedAt: number): Promise<void> {
  const table = await sessions();
  const session: Session = {
    id: newId(),
    kind,
    day: localDayKey(new Date(completedAt)),
    completedAt,
  };
  try {
    await table.put(session);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not save the finished session.");
  }
}

/** How many sessions of a kind finished on a given local calendar day. */
export async function countSessionsOnDay(kind: Session["kind"], day: string): Promise<number> {
  const table = await sessions();
  return table.where("day").equals(day).and((session) => session.kind === kind).count();
}

/**
 * Sessions of a kind finished on each of the last `days` local calendar dates, oldest first,
 * ending today. Days with nothing are returned as zero, so a chart can render an empty day.
 */
export async function countSessionsByDay(
  kind: Session["kind"],
  days: number,
): Promise<{ day: string; count: number }[]> {
  const table = await sessions();
  const keys: string[] = [];
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    keys.push(localDayKey(date));
  }
  const counts = await Promise.all(
    keys.map(async (day) => ({
      day,
      count: await table.where("day").equals(day).and((session) => session.kind === kind).count(),
    })),
  );
  return counts;
}
