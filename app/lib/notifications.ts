// app/lib/notifications.ts  (React Native / Expo, expo-notifications)
import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Linking, Platform } from "react-native";
import { channelFor, DEFAULT_ALERT_PREFS, SOUND_IDS, VIBRATION, type AlertPrefs, type SoundId, type VibratePattern } from "./alertChannel";

/** Call once at app start. */
export async function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () =>
      // Show a banner and play the sound even when the app is open. (SDK < 53: use shouldShowAlert instead of Banner/List.)
      ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) as any,
  });
  await Notifications.setNotificationCategoryAsync("alert", [
    { identifier: "seen", buttonTitle: "Mark as seen", options: { opensAppToForeground: false } },
    { identifier: "open", buttonTitle: "Open", options: { opensAppToForeground: true } },
  ]);
}

const VIBRATE_PATTERNS: readonly VibratePattern[] = ["short", "long", "pulse"];

function isSoundId(value: unknown): value is SoundId {
  return typeof value === "string" && (SOUND_IDS as readonly string[]).includes(value);
}

function isVibratePattern(value: unknown): value is VibratePattern {
  return typeof value === "string" && (VIBRATE_PATTERNS as readonly string[]).includes(value);
}

/** Prefs saved by Settings. Invalid values fall back to the defaults so the channel id stays known. */
export async function loadAlertPrefs(): Promise<AlertPrefs> {
  const saved = await SecureStore.getItemAsync("jic_prefs");
  if (!saved) return DEFAULT_ALERT_PREFS;
  try {
    const parsed = JSON.parse(saved) as Partial<AlertPrefs>;
    return {
      override: parsed.override !== false,
      sound: {
        enabled: parsed.sound?.enabled !== false,
        id: isSoundId(parsed.sound?.id) ? parsed.sound.id : DEFAULT_ALERT_PREFS.sound.id,
      },
      vibrate: {
        enabled: parsed.vibrate?.enabled !== false,
        pattern: isVibratePattern(parsed.vibrate?.pattern) ? parsed.vibrate.pattern : DEFAULT_ALERT_PREFS.vibrate.pattern,
      },
    };
  } catch {
    return DEFAULT_ALERT_PREFS;
  }
}

async function createAlertChannel(p: AlertPrefs) {
  await Notifications.setNotificationChannelAsync(channelFor(p), {
    name: `Message alerts${p.override ? " (override)" : ""}`,
    description: "New messages from callers",
    importance: Notifications.AndroidImportance.MAX,
    sound: p.sound.enabled ? `${p.sound.id}.wav` : null,
    enableVibrate: p.vibrate.enabled,
    vibrationPattern: p.vibrate.enabled ? VIBRATION[p.vibrate.pattern] : undefined,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableLights: true,
    lightColor: "#14B8A6",
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
}

/**
 * Android: create the channel that matches the user's current settings, plus the default
 * channel named in app.json. Channels cannot be edited later, so each combination gets its own id.
 * iPhone has no channels, so this does nothing there.
 */
export async function ensureAlertChannel(p: AlertPrefs) {
  if (Platform.OS !== "android") return;
  await createAlertChannel(p);
  if (channelFor(p) !== channelFor(DEFAULT_ALERT_PREFS)) await createAlertChannel(DEFAULT_ALERT_PREFS);
}

/** Call once at startup, and before requesting an Expo push token. */
export async function prepareNotifications() {
  await configureNotifications();
  await ensureAlertChannel(await loadAlertPrefs());
}

export type PermissionStatus = {
  notifications: "granted" | "denied" | "undetermined";
  criticalAlerts: boolean | null; // iOS only
  overrideDnd: boolean | null; // Android only: is the app's channel actually allowed to override Do Not Disturb?
};

export async function getPermissionStatus(p: AlertPrefs): Promise<PermissionStatus> {
  const perm = await Notifications.getPermissionsAsync();
  const out: PermissionStatus = { notifications: perm.granted ? "granted" : perm.canAskAgain ? "undetermined" : "denied", criticalAlerts: null, overrideDnd: null };
  if (Platform.OS === "ios") out.criticalAlerts = !!(perm as any).ios?.allowsCriticalAlerts;
  if (Platform.OS === "android") out.overrideDnd = !!(await Notifications.getNotificationChannelAsync(channelFor(p)))?.bypassDnd;
  return out;
}

/** Must be called from a button tap. Also asks for Critical Alerts; iOS ignores that until Apple approves the entitlement. */
export const requestPermissions = () =>
  Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true, allowCriticalAlerts: true } } as any);

/** Get the Expo push token and register this device with the server. Only registers if permission is granted. */
export async function registerDevice(api: { registerDevice: (b: { token: string; platform: string; tz: string }) => Promise<void> }) {
  // if (!Device.isDevice) return null;
  await prepareNotifications();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.registerDevice({ token, platform: Platform.OS, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  return token;
}

export const openSystemSettings = () => Linking.openSettings();
/** Android: the screen where the user lets the app override Do Not Disturb. */
export const openDndSettings = () =>
  Platform.OS === "android" ? Linking.sendIntent("android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS") : Linking.openSettings();

/** "Mark as seen" and opening a message both stop the repeats. Returns an unsubscribe function. */
export function listenForResponses(h: { onSeen: (alertId: string) => void; onOpen: (messageId: string) => void }) {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const d: any = r.notification.request.content.data ?? {};
    if (d.alertId) h.onSeen(d.alertId);
    if (r.actionIdentifier !== "seen" && d.messageId) h.onOpen(d.messageId);
  });
  return () => sub.remove();
}
