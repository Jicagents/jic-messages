// app/lib/prefs.ts: same shape as the server's Prefs (server/push.ts). Keep them in sync.
import type { AlertPrefs } from "./alertChannel";
export type Prefs = AlertPrefs & { v: 2; repeatMin: RepeatMin; privacy: { preview: "hidden" | "sender" | "full" } };
/** Unread reminder interval in minutes. 2/5/10 are offered; 1 stays valid for prefs saved by older builds. */
export type RepeatMin = 0 | 1 | 2 | 5 | 10;
export const REPEAT_CHOICES: RepeatMin[] = [0, 2, 5, 10];
