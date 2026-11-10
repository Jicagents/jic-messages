import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { signOut } from "../lib/auth";

export default function Settings() {
  const [biometric, setBiometric] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    async function check() {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(compatible && enrolled);
      const enabled = await SecureStore.getItemAsync("jic_biometric");
      setBiometric(enabled === "true");
      const notif = await SecureStore.getItemAsync("jic_notifications");
      setNotifications(notif !== "false");
    }
    check();
  }, []);

  async function toggleBiometric(value: boolean) {
    if (value && hasBiometric) {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable biometric unlock" });
      if (!result.success) return;
    }
    setBiometric(value);
    await SecureStore.setItemAsync("jic_biometric", value ? "true" : "false");
  }

  async function toggleNotifications(value: boolean) {
    setNotifications(value);
    await SecureStore.setItemAsync("jic_notifications", value ? "true" : "false");
  }

  async function handleLogout() {
    await signOut();
    router.replace("/");
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.row}>
          <Text style={styles.label}>Message notifications</Text>
          <Switch value={notifications} onValueChange={toggleNotifications} trackColor={{ true: "#14b8a6" }} />
        </View>
        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  header: { backgroundColor: "#0c2340", flexDirection: "row", alignItems: "center", paddingTop: 40, paddingBottom: 12, paddingHorizontal: 16 },
  back: { color: "#fff", fontSize: 24, marginRight: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  content: { padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 },
  label: { fontSize: 16, color: "#0c2340" },
  logout: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  logoutText: { color: "#fff", fontWeight: "700" },
});
