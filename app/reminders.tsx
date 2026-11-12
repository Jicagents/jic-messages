import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { REPEAT_CHOICES, type RepeatMin } from "./lib/prefs";
import { loadPrefs, savePrefs, type AppPrefs } from "../lib/prefsStore";
import { Screen } from "../components/Screen";
import { Card, SectionLabel } from "../components/ui";
import { Choices } from "../components/Rows";
import { colors, space, type } from "../lib/theme";

export default function Reminders() {
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  if (!prefs) return <Screen title="Unread Reminders" back><Text style={type.muted}>Loading…</Text></Screen>;
  // A value saved by an older build (1 min) stays selectable until the user picks another one.
  const values: RepeatMin[] = REPEAT_CHOICES.includes(prefs.repeatMin) ? REPEAT_CHOICES : [...REPEAT_CHOICES, prefs.repeatMin].sort((a, b) => a - b);

  return (
    <Screen title="Unread Reminders" back>
      <Card>
        <SectionLabel>Remind me every</SectionLabel>
        <Choices<RepeatMin>
          options={values.map((v) => ({ v, label: v === 0 ? "Off" : `${v} min` }))}
          value={prefs.repeatMin}
          onChange={(v) => {
            const next = { ...prefs, repeatMin: v };
            setPrefs(next);
            savePrefs(next).catch(() => {});
          }}
        />
        <Text style={styles.note}>Reminders repeat until someone opens the message.</Text>
      </Card>
      <Card>
        <SectionLabel>Status</SectionLabel>
        <Text style={styles.body}>Reminders are scheduled on this phone while you have unread messages, and they stop when you open them. They use your alert sound and ring on vibrate setting. The phone updates its list when you open the app or a message arrives while it is open, so a message that arrives while the app is closed starts reminding once you next open it.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, fontSize: 15.5 },
  note: { ...type.muted, marginTop: space.md, color: colors.textFaint },
});
