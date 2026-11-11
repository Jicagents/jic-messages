// Shared with jic-agents-v3 (jic-site/src/server/alertChannel.ts, used by jic-site/src/server/push.ts).
// Keep channelFor identical. Android notification channels cannot be edited after they are created,
// so every combination of sound / vibration / override gets its own id. v1 channels were created
// before alarm-stream audio and cannot pick up that change.
export const ALERT_CHANNEL_PREFIX = "jic-alerts-v3";
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

/** Example for the defaults: jic-alerts-v3-chime-long-ovr. app.json defaultChannel must match channelFor(DEFAULT_ALERT_PREFS). */
export const channelFor = (p: AlertPrefs) =>
  `${ALERT_CHANNEL_PREFIX}-${p.sound.enabled ? p.sound.id : "mute"}-${p.vibrate.enabled ? p.vibrate.pattern : "still"}-${p.override ? "ovr" : "std"}`;
