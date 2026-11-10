// app/lib/prefs.ts: same shape as the server's Prefs (server/push.ts). Keep them in sync.
import type { AlertPrefs } from "./alertChannel";
export type Prefs = AlertPrefs & { v: 2; repeatMin: 0 | 1 | 2 | 5; privacy: { preview: "hidden" | "sender" | "full" } };
