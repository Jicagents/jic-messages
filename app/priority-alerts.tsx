import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { openDndSettings } from "./lib/notifications";
import { loadPrefs, savePrefs, type AppPrefs } from "../lib/prefsStore";
import { Screen } from "../components/Screen";
import { Card, PrimaryButton, SectionLabel } from "../components/ui";
import { SwitchRow } from "../components/Rows";
import { colors, space, type } from "../lib/theme";

export default function PriorityAlerts() {
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  function update(next: AppPrefs) {
    setPrefs(next);
    savePrefs(next).catch(() => {});
  }

  return (
    <Screen title="Priority Alerts" back>
      <Card>
        <SectionLabel>Ring on vibrate</SectionLabel>
        {prefs ? (
          <SwitchRow
            first
            title="Ring when the phone is on vibrate"
            subtitle="New message alerts play at alarm volume. Keep your alarm volume up."
            value={prefs.ringOnVibrate !== false}
            onChange={(v) => update({ ...prefs, ringOnVibrate: v })}
          />
        ) : (
          <Text style={type.muted}>Loading…</Text>
        )}
      </Card>

      <Card>
        <SectionLabel>Do Not Disturb</SectionLabel>
        <Text style={styles.body}>
          {Platform.OS === "android"
            ? "Android only lets alerts through Do Not Disturb if you allow it yourself. JIC Messages cannot turn this on for you, and some phones still silence alerts in Do Not Disturb."
            : "iPhone only lets alerts through Do Not Disturb or Focus if you allow JIC Messages in your Focus settings."}
        </Text>
        <Text style={styles.steps}>
          {Platform.OS === "android" ? "Settings → Notifications → Do Not Disturb → Apps → add JIC Messages. On some phones the screen is called “Do Not Disturb access”." : "Settings → Focus → Do Not Disturb → Apps → add JIC Messages."}
        </Text>
        <PrimaryButton style={styles.gap} label="Open Do Not Disturb settings" variant="ghost" onPress={openDndSettings} />
      </Card>

      <Card>
        <SectionLabel>Lock screen</SectionLabel>
        <Text style={styles.body}>Alerts on the lock screen never show the caller or the message. Unlock and open the app to read it.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, fontSize: 15.5 },
  steps: { ...type.muted, marginTop: space.md, lineHeight: 19, color: colors.aqua },
  gap: { marginTop: space.lg },
});
