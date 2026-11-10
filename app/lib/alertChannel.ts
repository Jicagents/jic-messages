import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const CH_VERSION = 1;
export const SOUND_IDS = ["default", "chime", "ping", "bell", "siren", "alarm"] as const;
export const VIBRATION = ["off", "short", "long", "pulse"] as const;

export type SoundId = typeof SOUND_IDS[number];
export type Vibration = typeof VIBRATION[number];

export interface Prefs {
  override: boolean;
  sound: boolean;
  soundId: SoundId;
  vibrate: boolean;
  pattern: Vibration;
  repeatMin: 0 | 1 | 2 | 5;
}

export const DEFAULT_PREFS: Prefs = {
  override: true,
  sound: true,
  soundId: "default",
  vibrate: true,
  pattern: "short",
  repeatMin: 0,
};

function channelId(prefs: Prefs): string {
  return `jic-v${CH_VERSION}-${prefs.sound ? prefs.soundId : "silent"}-${prefs.vibrate ? prefs.pattern : "novibe"}-${prefs.override ? "dnd" : "normal"}`;
}

export async function ensureAlertChannel(prefs: Prefs): Promise<string> {
  if (Platform.OS !== "android") return "default";
  const id = channelId(prefs);
  await Notifications.setNotificationChannelAsync(id, {
    name: `JIC Messages ${prefs.soundId}`,
    importance: prefs.override ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.HIGH,
    sound: prefs.sound ? prefs.soundId : null,
    vibrationPattern: prefs.vibrate ? patternMs(prefs.pattern) : null,
    bypassDnd: prefs.override,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  return id;
}

function patternMs(p: Vibration): number[] {
  if (p === "off") return [];
  if (p === "short") return [0, 200];
  if (p === "long") return [0, 500];
  return [0, 200, 100, 200, 100, 200];
}
