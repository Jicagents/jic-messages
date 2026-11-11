import { Linking, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { Screen } from "../components/Screen";
import { Card, PrimaryButton } from "../components/ui";
import { BrandLogo } from "../components/BrandLogo";
import { colors, space, type } from "../lib/theme";

export default function About() {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  return (
    <Screen title="About" back>
      <Card style={styles.center}>
        <BrandLogo size={64} style={styles.logo} />
        <Text style={styles.app}>JIC Messages</Text>
        <Text style={styles.ver}>Version {version}</Text>
        <Text style={styles.body}>Messages your JIC receptionist takes, delivered to your phone. By Just Incredible Communications.</Text>
      </Card>
      <View style={{ gap: space.md }}>
        <PrimaryButton label="Open jicagents.com" variant="ghost" onPress={() => Linking.openURL("https://jicagents.com")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  logo: { alignSelf: "center", marginBottom: space.lg },
  app: { ...type.h2, fontSize: 20 },
  ver: { ...type.muted, marginTop: 4 },
  body: { ...type.body, fontSize: 15, textAlign: "center", marginTop: space.md, color: colors.textMuted },
});
