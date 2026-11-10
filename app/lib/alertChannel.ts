// Shared by the server (src/server/alertChannel.ts) and the app (app/lib/alertChannel.ts). Keep the two copies identical.
// Android notification channels cannot be edited after they are created, so every combination of
// sound / vibration / override gets its own channel id. Bump CH_VERSION to change how a channel behaves.
export const CH_VERSION = "v1";
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

export const channelFor = (p: AlertPrefs) =>
  `alert-${p.sound.enabled ? p.sound.id : "mute"}-${p.vibrate.enabled ? p.vibrate.pattern : "still"}-${p.override ? "ovr" : "std"}-${CH_VERSION}`;
