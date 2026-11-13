import * as Notifications from "expo-notifications";
import { signOut } from "./auth";
import { cancelReminders } from "./reminders";

/**
 * Sign out and leave nothing readable behind: tokens, the scheduled unread reminder, and any
 * notifications still sitting in the tray. Messages are never written to disk by this app, so
 * there is no message cache to clear beyond this.
 */
export async function fullSignOut() {
  await signOut();
  await cancelReminders().catch(() => {});
  await Notifications.dismissAllNotificationsAsync().catch(() => {});
}
