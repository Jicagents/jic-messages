import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { signOut } from "../../lib/auth";
import { authorizedFetch } from "../../lib/messageApi";
import { currentSession } from "../../lib/session";
import { loadPrefs } from "../../lib/prefsStore";
import { Screen } from "../../components/Screen";
import { Avatar, Card, PrimaryButton, SectionLabel } from "../../components/ui";
import { NavRow } from "../../components/Rows";
import { colors, space, type } from "../../lib/theme";

type Me = { name: string; email: string; role: string | null; organization: { name: string } | null };

export default function Settings() {
  const [me, setMe] = useState<Me | null>(null);
  const [repeatMin, setRepeatMin] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let cancel = false;
      (async () => {
        const session = await currentSession();
        if (!cancel && session) setMe((prev) => prev ?? { name: session.email.split("@")[0], email: session.email, role: session.role || null, organization: null });
        try {
          const res = await authorizedFetch("https://jicagents.com/api/mobile/me");
          if (res.ok) {
            const data = await res.json();
            if (!cancel && data?.me) setMe(data.me);
          }
        } catch {
          // Older portal without /api/mobile/me: keep the token-based card.
        }
        const prefs = await loadPrefs();
        if (!cancel) setRepeatMin(prefs.repeatMin);
      })();
      return () => {
        cancel = true;
      };
    }, []),
  );

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will stop getting message alerts on this phone until you sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <Screen title="Settings" tabbed>
      <Card style={styles.profile}>
        <Avatar name={me?.name || me?.email || "?"} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{me?.name || "Signed in"}</Text>
          {me?.email ? <Text style={styles.sub} numberOfLines={1}>{me.email}</Text> : null}
          {me?.organization?.name ? <Text style={styles.org} numberOfLines={1}>{me.organization.name}{me.role ? ` · ${cap(me.role)}` : ""}</Text> : me?.role ? <Text style={styles.org}>{cap(me.role)}</Text> : null}
        </View>
      </Card>

      <Card>
        <SectionLabel>Alerts & Notifications</SectionLabel>
        <NavRow first icon="🔔" title="Notifications" subtitle="Permission, sound, vibration, test" onPress={() => router.push("/notifications")} />
        <NavRow icon="⚡" title="Priority Alerts" subtitle="Ring on vibrate, Do Not Disturb" onPress={() => router.push("/priority-alerts")} />
        <NavRow icon="⏱" title="Unread Reminders" subtitle={repeatMin ? `Every ${repeatMin} min until opened` : "Off"} onPress={() => router.push("/reminders")} />
      </Card>

      <Card>
        <SectionLabel>My Account</SectionLabel>
        <NavRow first icon="📅" title="My Schedule" subtitle="Upcoming on-call shifts" onPress={() => router.push("/schedule")} />
        <NavRow icon="🔒" title="App Security" subtitle="Biometric unlock" onPress={() => router.push("/security")} />
        <NavRow icon="ⓘ" title="About" onPress={() => router.push("/about")} />
      </Card>

      <PrimaryButton label="Sign Out" variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}

function cap(x: string) {
  return x ? x[0].toUpperCase() + x.slice(1) : x;
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg },
  name: { ...type.h2, fontSize: 19 },
  sub: { ...type.muted, marginTop: 2 },
  org: { fontSize: 13, color: colors.aqua, marginTop: 4, fontWeight: "600" },
});
