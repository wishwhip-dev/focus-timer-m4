/**
 * Queries over the settings table — named values the visitor chose, such as whether the end-of-
 * session chime is muted. Components call these, never Dexie directly.
 */
import { database } from "@/lib/db";

const settings = async () => (await database.ready()).settings;

export async function getSetting(key: string): Promise<string | undefined> {
  const table = await settings();
  const row = await table.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const table = await settings();
  await table.put({ key, value });
}
