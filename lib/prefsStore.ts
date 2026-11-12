import * as SecureStore from "expo-secure-store";
import { DEFAULT_ALERT_PREFS, type AlertPrefs } from "../app/lib/alertChannel";
import { ensureAlertChannel, loadAlertPrefs } from "../app/lib/notifications";
import type { RepeatMin } from "../app/lib/prefs";
import { authorizedFetch } from "./messageApi";
import { syncRemindersFromServer } from "./reminders";

export type AppPrefs = AlertPrefs & { repeatMin: RepeatMin };

const KEY = "jic_prefs";
const REPEATS: RepeatMin[] = [0, 1, 2, 5, 10];

/** Same "jic_prefs" record older builds saved. Unknown values fall back to defaults; nothing is rewritten on read. */
export async function loadPrefs(): Promise<AppPrefs> {
  const alert = await loadAlertPrefs();
  let repeatMin: RepeatMin = 0;
  try {
    const raw = JSON.parse((await SecureStore.getItemAsync(KEY)) || "{}") as { repeatMin?: unknown };
    if (REPEATS.includes(raw.repeatMin as RepeatMin)) repeatMin = raw.repeatMin as RepeatMin;
  } catch {
    repeatMin = 0;
  }
  return { ...DEFAULT_ALERT_PREFS, ...alert, repeatMin };
}

/** Save on the phone, rebuild the Android alert channel, and tell the portal (best effort). */
export async function savePrefs(next: AppPrefs): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  await ensureAlertChannel(next).catch(() => {});
  await authorizedFetch("https://jicagents.com/api/mobile/prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs: next }),
  }).catch(() => {});
  // Reminders run on the phone: apply the new interval right away.
  await syncRemindersFromServer(next.repeatMin).catch(() => {});
}
