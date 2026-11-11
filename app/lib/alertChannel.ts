// The phone's alarm channel. Portal push in jic-site/src/server/push.ts should send this
// channelId. Until it does, it still sends alert-...-v1 from jic-site/src/server/alertChannel.ts;
// legacyServerChannelIds() is that full set, and the app creates each one.
export const ALERT_CHANNEL_ID = "jic-alerts-v3";
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
};

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  override: true,
  sound: { enabled: true, id: "chime" },
  vibrate: { enabled: true, pattern: "long" },
};

const LEGACY_SOUNDS = [...SOUND_IDS, "mute"] as const;
const LEGACY_VIBES = ["short", "long", "pulse", "still"] as const;
const LEGACY_MODES = ["ovr", "std"] as const;

/** Every channelId jic-site/src/server/alertChannel.ts can emit while CH_VERSION is v1. */
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
