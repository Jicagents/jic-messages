import { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { prepareNotifications } from "./lib/notifications";
import { messageIdFromData } from "../lib/messageApi";

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

    openResponse(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
    return () => subscription.remove();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
