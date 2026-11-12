import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Platform, StyleSheet, Text } from "react-native";
import { SOUND_IDS, type SoundId, type VibratePattern } from "./lib/alertChannel";
import { getPermissionStatus, openSystemSettings, requestPermissions, scheduleAlarmTest } from "./lib/notifications";
import { previewSound } from "./lib/previewSound";
import { loadPrefs, savePrefs, type AppPrefs } from "../lib/prefsStore";
import { Screen } from "../components/Screen";
import { Card, PrimaryButton, SectionLabel } from "../components/ui";
import { Choices, SwitchRow } from "../components/Rows";
import { colors, space, type } from "../lib/theme";

const VIBES: { v: VibratePattern; label: string }[] = [{ v: "short", label: "Short" }, { v: "long", label: "Long" }, { v: "pulse", label: "Pulse" }];
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  const [perm, setPerm] = useState<"granted" | "denied" | "undetermined" | null>(null);

  const refreshPerm = useCallback(async (p: AppPrefs) => {
    const status = await getPermissionStatus(p).catch(() => null);
    setPerm(status?.notifications ?? null);
  }, []);

  useEffect(() => {
    loadPrefs().then((p) => {
      setPrefs(p);
      refreshPerm(p);
    });
  }, [refreshPerm]);

  useEffect(() => {
    if (!prefs) return;
    const sub = AppState.addEventListener("change", (state) => state === "active" && refreshPerm(prefs));
    return () => sub.remove();
  }, [prefs, refreshPerm]);

  function update(next: AppPrefs) {
    setPrefs(next);
    savePrefs(next).catch(() => {});
  }

  async function allow() {
    const res = await requestPermissions();
    if (!res.granted && !res.canAskAgain) openSystemSettings();
    if (prefs) refreshPerm(prefs);
  }

  async function test() {
    try {
      await scheduleAlarmTest();
    } catch (e) {
      Alert.alert("Couldn't send test", e instanceof Error ? e.message : "Notifications are off");
    }
  }

  if (!prefs) return <Screen title="Notifications" back><Text style={type.muted}>Loading…</Text></Screen>;

  return (
    <Screen title="Notifications" back>
      <Card>
        <SectionLabel>Permission</SectionLabel>
        <Text style={styles.body}>
          {perm === "granted" ? "Notifications are allowed for JIC Messages." : perm === "denied" ? "Notifications are turned off for JIC Messages in your phone settings." : "JIC Messages has not been allowed to send notifications yet."}
        </Text>
        {perm !== "granted" ? <PrimaryButton style={styles.gap} label={perm === "denied" ? "Open phone settings" : "Allow notifications"} onPress={perm === "denied" ? openSystemSettings : allow} /> : null}
      </Card>

      <Card>
        <SectionLabel>New message alerts</SectionLabel>
        <SwitchRow first title="Sound" value={prefs.sound.enabled} onChange={(v) => update({ ...prefs, sound: { ...prefs.sound, enabled: v } })} />
        {prefs.sound.enabled ? (
          <Choices<SoundId> options={SOUND_IDS.map((s) => ({ v: s, label: cap(s) }))} value={prefs.sound.id} onChange={(v) => { update({ ...prefs, sound: { ...prefs.sound, id: v } }); previewSound(v); }} />
        ) : null}
        {Platform.OS === "android" ? (
          <>
            <SwitchRow title="Vibrate" value={prefs.vibrate.enabled} onChange={(v) => update({ ...prefs, vibrate: { ...prefs.vibrate, enabled: v } })} />
            {prefs.vibrate.enabled ? <Choices<VibratePattern> options={VIBES} value={prefs.vibrate.pattern} onChange={(v) => update({ ...prefs, vibrate: { ...prefs.vibrate, pattern: v } })} /> : null}
          </>
        ) : null}
        <Text style={styles.note}>{"Android keeps separate channels for message alerts, unread reminders, and general notices. You can also fine-tune each one in your phone's notification settings."}</Text>
      </Card>

      <PrimaryButton label="Send test notification" onPress={test} />
      <PrimaryButton label="Phone notification settings" variant="ghost" onPress={openSystemSettings} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, fontSize: 15.5 },
  gap: { marginTop: space.md },
  note: { ...type.muted, marginTop: space.md, lineHeight: 19, color: colors.textFaint },
});
