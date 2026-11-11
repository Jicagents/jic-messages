import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Screen } from "../components/Screen";
import { Card, SectionLabel } from "../components/ui";
import { SwitchRow } from "../components/Rows";
import { space, type } from "../lib/theme";

export default function AppSecurity() {
  const [biometric, setBiometric] = useState(false);
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(compatible && enrolled);
      setBiometric((await SecureStore.getItemAsync("jic_biometric")) === "true");
    })();
  }, []);

  async function toggle(value: boolean) {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable biometric unlock" });
      if (!result.success) return;
    }
    setBiometric(value);
    await SecureStore.setItemAsync("jic_biometric", value ? "true" : "false");
  }

  return (
    <Screen title="App Security" back>
      <Card>
        <SectionLabel>Unlock</SectionLabel>
        <SwitchRow
          first
          title="Biometric unlock"
          subtitle={hasBiometric === false ? "Set up a fingerprint or face unlock on this phone first." : "Ask for your fingerprint or face when the app opens."}
          value={biometric}
          onChange={toggle}
          disabled={!hasBiometric}
        />
      </Card>
      <Card>
        <SectionLabel>Your sign-in</SectionLabel>
        <Text style={styles.body}>You stay signed in on this phone. Your sign-in is kept in the phone's secure storage and renews itself. Sign out from Settings to remove it.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { ...type.body, fontSize: 15.5, marginTop: space.xs } });
