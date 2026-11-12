import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { prepareNotifications } from "./lib/notifications";
import { messageIdFromData } from "../lib/messageApi";
import { loadPrefs } from "../lib/prefsStore";
import { syncRemindersFromServer } from "../lib/reminders";
import { colors } from "../lib/theme";

export default function Layout() {
  useEffect(() => {
    prepareNotifications().catch(() => {});
    const opened = new Set<string>();

    function openResponse(response: Notifications.NotificationResponse | null) {
      if (!response || response.actionIdentifier === "seen") return;
      const key = response.notification.request.identifier;
      if (opened.has(key)) return;
      // Server push data.messageId is messages.id (UUID). Do not fall back to a url or call ref.
      const messageId = messageIdFromData(response.notification.request.content.data);
      if (!messageId) return;
      opened.add(key);
      router.push(`/message/${encodeURIComponent(messageId)}`);
      Notifications.clearLastNotificationResponse();
    }

    // Keep the unread reminder in step with the inbox: at launch, when the app returns, when a push arrives in the app.
    const syncReminders = () => loadPrefs().then((p) => syncRemindersFromServer(p.repeatMin)).catch(() => {});
    syncReminders();
    const appState = AppState.addEventListener("change", (st) => st === "active" && syncReminders());
    const received = Notifications.addNotificationReceivedListener(syncReminders);

    openResponse(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    return () => {
      subscription.remove();
      appState.remove();
      received.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}
