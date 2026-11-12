import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { REMINDER_CHANNEL_ID } from "../app/lib/alertChannel";
import { loadAlertPrefs } from "../app/lib/notifications";
import type { RepeatMin } from "../app/lib/prefs";
import { reminderPlan } from "./reminderPlan";
import { authorizedFetch, messagesListUrl } from "./messageApi";
import { messageIsRead } from "./redirect";

/** One repeating local reminder for all unread messages. Its body never names a caller or message. */
const REMINDER_ID = "jic-unread-reminder";

export async function cancelReminders() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}

/**
 * Make the phone's scheduled reminder match reality. Call it with the unread count whenever that
 * is known (inbox load, app returns to foreground, a message is opened) and when the interval changes.
 * It leaves an already-correct schedule alone so the repeat timer is not restarted on every call.
 */
export async function applyReminders(unreadCount: number, repeatMin: RepeatMin) {
  const plan = reminderPlan(unreadCount, repeatMin);
  const perm = await Notifications.getPermissionsAsync();
  if (!plan || !perm.granted) return cancelReminders();

  const existing = (await Notifications.getAllScheduledNotificationsAsync()).find((n) => n.identifier === REMINDER_ID);
  const trigger = existing?.trigger as { seconds?: number; repeats?: boolean } | null | undefined;
  if (trigger && trigger.seconds === plan.seconds && trigger.repeats) return;

  await cancelReminders();
  const prefs = await loadAlertPrefs();
  const soundOn = prefs.sound.enabled !== false;
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "JIC Messages",
      body: "You have unread messages.",
      // iPhone plays this file; on Android the channel's sound and alarm-volume setting decide.
      sound: soundOn ? `${prefs.sound.id}.wav` : false,
      data: { reminder: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: plan.seconds,
      repeats: true,
      ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });
}

/** Fetch the inbox, count unread, and apply. Network errors keep the current schedule. */
export async function syncRemindersFromServer(repeatMin: RepeatMin) {
  try {
    const res = await authorizedFetch(messagesListUrl("all", ""));
    if (!res.ok) return;
    const data = await res.json();
    const list: { status?: string | null }[] = Array.isArray(data?.messages) ? data.messages : [];
    await applyReminders(list.filter((m) => !messageIsRead({ status: m.status })).length, repeatMin);
  } catch {
    /* offline or signed out: leave things as they are */
  }
}
