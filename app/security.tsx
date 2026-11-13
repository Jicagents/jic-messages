import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { Card, SectionLabel } from "../components/ui";
import { Choices } from "../components/Rows";
import { hasScreenLock } from "../lib/deviceAuth";
import { DEFAULT_LOCK_MINUTES, LOCK_CHOICES, type LockMinutes } from "../lib/lockPolicy";
import { loadLockMinutes, saveLockMinutes } from "../lib/lockStore";
import { space, type } from "../lib/theme";

export default function AppSecurity() {
  const [minutes, setMinutes] = useState<LockMinutes>(DEFAULT_LOCK_MINUTES);
  const [screenLock, setScreenLock] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      setMinutes(await loadLockMinutes());
      setScreenLock(await hasScreenLock());
    })();
  }, []);

  async function choose(value: LockMinutes) {
    setMinutes(value);
    await saveLockMinutes(value);
  }

  return (
    <Screen title="App Security" back>
      <Card>
        <SectionLabel>Unlock</SectionLabel>
        <Text style={styles.body}>
          JIC Messages always asks for your fingerprint, face, or phone PIN when it opens. This can't be turned off.
          {screenLock === false ? " This phone has no screen lock set, so set one in your phone's Settings to keep using the app." : ""}
        </Text>
      </Card>
      <Card>
        <SectionLabel>Lock after being away</SectionLabel>
        <Text style={styles.body}>Ask to unlock again when you come back after:</Text>
        <Choices options={LOCK_CHOICES.map((c) => ({ v: c.v, label: c.label }))} value={minutes} onChange={choose} />
      </Card>
      <Card>
        <SectionLabel>Privacy screen</SectionLabel>
        <Text style={styles.body}>Screenshots and screen recordings are blocked, and the app shows a blank cover in the phone's recent-apps view.</Text>
      </Card>
      <Card>
        <SectionLabel>Your sign-in</SectionLabel>
        <Text style={styles.body}>You stay signed in on this phone. Your sign-in is kept in the phone's secure storage and renews itself. Sign out from Settings to remove it, along with any alerts waiting on this phone.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { ...type.body, fontSize: 15.5, marginTop: space.xs, marginBottom: space.sm } });
