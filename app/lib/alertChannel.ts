// The phone's alarm channel. Portal push in jic-site/src/server/push.ts should send this
// channelId, and it now does. legacyServerChannelIds() lists the retired alert-...-v1 ids so the
// app can delete them (they showed up as dozens of identical "Message alerts" channels).
export const ALERT_CHANNEL_ID = "jic-alerts-v3";
/** Unread reminders: high importance, uses the same sound, vibration and ring-on-vibrate setting as alerts. */
export const REMINDER_CHANNEL_ID = "jic-reminders";
/** Test and app info notifications: default importance. */
export const GENERAL_CHANNEL_ID = "jic-general";
export const SOUND_IDS = ["chime", "ping", "bell", "siren", "alarm"] as const;
export type SoundId = (typeof SOUND_IDS)[number];
export type VibratePattern = "short" | "long" | "pulse";
export const VIBRATION: Record<VibratePattern, number[]> = {
  short: [0, 250],
  long: [0, 800],
  pulse: [0, 300, 200, 300, 200, 300],
};

export type AlertPrefs = {
  /** Break through Do Not Disturb / Focus / silent where the phone's OS allows it. */
  override: boolean;
  sound: { enabled: boolean; id: SoundId };
  vibrate: { enabled: boolean; pattern: VibratePattern };
  /** Play new-message alerts on the alarm stream so they ring when the phone is on vibrate. Default on. */
  ringOnVibrate?: boolean;
};

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  override: true,
  sound: { enabled: true, id: "chime" },
  vibrate: { enabled: true, pattern: "long" },
  ringOnVibrate: true,
};

const LEGACY_SOUNDS = [...SOUND_IDS, "mute"] as const;
const LEGACY_VIBES = ["short", "long", "pulse", "still"] as const;
const LEGACY_MODES = ["ovr", "std"] as const;

/** Every retired channelId the old portal could emit while CH_VERSION was v1. The app deletes these. */
export function legacyServerChannelIds(): string[] {
  const ids: string[] = [];
  for (const sound of LEGACY_SOUNDS) {
    for (const vibe of LEGACY_VIBES) {
      for (const mode of LEGACY_MODES) ids.push(`alert-${sound}-${vibe}-${mode}-v1`);
    }
  }
  return ids;
}

/** Ids from the short-lived jic-alerts-v3-<prefs> scheme. Deleted, not recreated. */
export function retiredPrefixedChannelIds(): string[] {
  const ids: string[] = [];
  for (const sound of LEGACY_SOUNDS) {
    for (const vibe of LEGACY_VIBES) {
      for (const mode of LEGACY_MODES) ids.push(`${ALERT_CHANNEL_ID}-${sound}-${vibe}-${mode}`);
    }
  }
  return ids;
}

export const channelFor = (_p?: AlertPrefs) => ALERT_CHANNEL_ID;

/**
 * Sound file and vibration for every alarm channel on this phone (jic-alerts-v3 and the
 * legacy alert-...-v1 ids the portal may still send). The master toggles win over the
 * sound and vibe encoded in a legacy channel id, so a push on an old id follows the
 * settings saved on the phone.
 */
export function channelMedia(prefs: AlertPrefs): { soundFile: string | null; pattern: number[] | null } {
  const soundOn = prefs.sound.enabled !== false;
  const vibrateOn = prefs.vibrate.enabled !== false;
  const soundId = (SOUND_IDS as readonly string[]).includes(prefs.sound.id) ? prefs.sound.id : DEFAULT_ALERT_PREFS.sound.id;
  const patternName = prefs.vibrate.pattern;
  const pattern = patternName === "short" || patternName === "long" || patternName === "pulse" ? VIBRATION[patternName] : VIBRATION.long;
  return {
    soundFile: soundOn ? `${soundId}.wav` : null,
    pattern: vibrateOn ? pattern : null,
  };
}
