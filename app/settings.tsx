import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { signOut, getAccess } from "../lib/auth";
import { ensureAlertChannel, DEFAULT_PREFS, SOUND_IDS, VIBRATION, Prefs } from "./lib/alertChannel";

export default function Settings() {
  const [biometric, setBiometric] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    async function check() {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(compatible && enrolled);
      const enabled = await SecureStore.getItemAsync("jic_biometric");
      setBiometric(enabled === "true");
      const saved = await SecureStore.getItemAsync("jic_prefs");
      if (saved) setPrefs(JSON.parse(saved));
    }
    check();
  }, []);

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    await SecureStore.setItemAsync("jic_prefs", JSON.stringify(next));
    await ensureAlertChannel(next);
    const token = await getAccess();
    if (token) {
      await fetch("https://jicagents.com/api/mobile/prefs", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: next }),
      }).catch(() => {});
    }
  }

  async function toggleBiometric(value: boolean) {
    if (value && hasBiometric) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable biometric unlock" });
      if (!result.success) return;
    }
    setBiometric(value);
    await SecureStore.setItemAsync("jic_biometric", value ? "true" : "false");
  }

  async function sendTest() {
    const token = await getAccess();
    if (!token) return Alert.alert("Not signed in");
    await fetch("https://jicagents.com/api/mobile/test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    Alert.alert("Test sent", "Check your notifications");
  }

  async function handleLogout() {
    await signOut();
    router.replace("/");
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.content}>
        {hasBiometric && (
          <View style={styles.row}>
            <Text style={styles.label}>Biometric unlock</Text>
            <Switch value={biometric} onValueChange={toggleBiometric} trackColor={{ true: "#14b8a6" }} />
          </View>
        )}

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Override silent/DND</Text>
          <Switch value={prefs.override} onValueChange={(v) => savePrefs({ ...prefs, override: v })} trackColor={{ true: "#14b8a6" }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Sound</Text>
          <Switch value={prefs.sound} onValueChange={(v) => savePrefs({ ...prefs, sound: v })} trackColor={{ true: "#14b8a6" }} />
        </View>
        {prefs.sound && (
          <View style={styles.options}>
            {SOUND_IDS.map((s) => (
              <TouchableOpacity key={s} style={[styles.opt, prefs.soundId === s && styles.optOn]} onPress={() => savePrefs({ ...prefs, soundId: s })}>
                <Text style={styles.optText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {Platform.OS === "android" && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Vibrate</Text>
              <Switch value={prefs.vibrate} onValueChange={(v) => savePrefs({ ...prefs, vibrate: v })} trackColor={{ true: "#14b8a6" }} />
            </View>
            {prefs.vibrate && (
              <View style={styles.options}>
                {VIBRATION.filter(v => v !== "off").map((p) => (
                  <TouchableOpacity key={p} style={[styles.opt, prefs.pattern === p && styles.optOn]} onPress={() => savePrefs({ ...prefs, pattern: p })}>
                    <Text style={styles.optText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Ring again if not opened</Text>
        </View>
        <View style={styles.options}>
          {[0, 1, 2, 5].map((m) => (
            <TouchableOpacity key={m} style={[styles.opt, prefs.repeatMin === m && styles.optOn]} onPress={() => savePrefs({ ...prefs, repeatMin: m as 0|1|2|5 })}>
              <Text style={styles.optText}>{m === 0 ? "Off" : `${m} min`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.testBtn} onPress={sendTest}>
          <Text style={styles.testText}>Send test alert</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  header: { backgroundColor: "#0c2340", flexDirection: "row", alignItems: "center", paddingTop: 40, paddingBottom: 12, paddingHorizontal: 16 },
  back: { color: "#fff", fontSize: 24, marginRight: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  content: { padding: 16 },
  section: { fontSize: 14, color: "#5b6b7c", marginTop: 16, marginBottom: 8, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 8 },
  label: { fontSize: 16, color: "#0c2340" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  opt: { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  optOn: { backgroundColor: "#14b8a6", borderColor: "#14b8a6" },
  optText: { color: "#0c2340", fontSize: 14 },
  testBtn: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  testText: { color: "#fff", fontWeight: "700" },
  logout: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12, marginBottom: 32 },
  logoutText: { color: "#fff", fontWeight: "700" },
});
