import type { RepeatMin } from "../app/lib/prefs";

/** Pure rule: should a reminder be running, and every how many seconds? */
export function reminderPlan(unreadCount: number, repeatMin: RepeatMin): { seconds: number } | null {
  if (!repeatMin || unreadCount <= 0) return null;
  return { seconds: repeatMin * 60 };
}

