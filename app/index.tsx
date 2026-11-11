import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { signIn, getValidAccess } from "../lib/auth";
import * as Notifications from "expo-notifications";
import { authorizedFetch } from "../lib/messageApi";
import { prepareNotifications } from "./lib/notifications";
import { BrandLogo } from "../components/BrandLogo";
import { PrimaryButton } from "../components/ui";
import { BOTTOM_GAP, card, colors, radius, space, type } from "../lib/theme";

const SAVED_EMAIL = "jic_saved_email";
const REMEMBER_EMAIL = "jic_remember_email";

async function loadRememberedEmail(): Promise<{ email: string; remember: boolean }> {
  try {
    const [saved, flag] = await Promise.all([SecureStore.getItemAsync(SAVED_EMAIL), SecureStore.getItemAsync(REMEMBER_EMAIL)]);
    // An empty string cannot be stored on every platform. Treat it, or an explicit flag, as "don't remember".
    if (flag === "false" || saved === "") return { email: "", remember: false };
    if (saved) return { email: saved, remember: true };
  } catch (e) {
    console.log("Could not read remembered email:", e);
  }
  return { email: "", remember: true };
}

async function storeRememberedEmail(remember: boolean, email: string) {
  try {
    if (remember && email) {
      await SecureStore.setItemAsync(SAVED_EMAIL, email);
      await SecureStore.setItemAsync(REMEMBER_EMAIL, "true");
      return;
    }
    await SecureStore.setItemAsync(REMEMBER_EMAIL, "false");
    await SecureStore.deleteItemAsync(SAVED_EMAIL).catch(() => {});
  } catch (e) {
    console.log("Could not store remembered email:", e);
  }
}

async function registerDevice() {
  try {
    await prepareNotifications();
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.granted ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;
    if (!token) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver";
    await authorizedFetch("https://jicagents.com/api/mobile/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: Platform.OS, tz }),
    });
  } catch (e) {
    console.log("Push registration skipped:", e);
  }
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const manualSignIn = useRef(false);

  useEffect(() => {
    let cancel = false;
    async function start() {
      try {
        const remembered = await loadRememberedEmail();
        if (cancel) return;
        if (remembered.email) setEmail(remembered.email);
        if (!remembered.remember) setRemember(false);
        const enabled = await SecureStore.getItemAsync("jic_biometric");
        // Access tokens expire in 15 minutes. Refresh before the inbox or a message fetch runs.
        const token = await getValidAccess();
        if (cancel || manualSignIn.current || !token) return;
        if (enabled === "true") {
          const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock JIC Messages" });
          if (!result.success || cancel || manualSignIn.current) return;
        }
        // Stay signed in. Refresh the push token without blocking the inbox on a slow Expo request.
        void registerDevice();
        router.replace("/inbox");
      } catch {
        // A failed refresh or biometric prompt leaves the sign-in form in place.
      } finally {
        if (!cancel) setChecking(false);
      }
    }
    start();
    return () => {
      cancel = true;
    };
  }, []);

  async function handleSignIn() {
    if (loading) return;
    manualSignIn.current = true;
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Remember me keeps the email filled in next time. Staying signed in works either way.
      await storeRememberedEmail(remember, email.trim());
      await registerDevice();
      router.replace("/inbox");
    } catch (e) {
      manualSignIn.current = false;
      setError(e instanceof Error && e.message === "Invalid credentials" ? "That email and password don't match. Try again." : e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + BOTTOM_GAP }]}
        keyboardShouldPersistTaps="handled"
      >
        <BrandLogo size={72} style={styles.logo} />
        <Text style={styles.appName}>JIC Messages</Text>
        <Text style={styles.tagline}>Your messages, wherever you are.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>
          <Text style={styles.cardSub}>Use your JIC Agents portal email and password.</Text>

          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              style={styles.input}
              placeholder="you@yourpractice.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              keyboardType="email-address"
              placeholderTextColor={colors.textFaint}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              placeholderTextColor={colors.textFaint}
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
              <Text style={styles.eye}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.rememberRow} onPress={() => setRemember(!remember)} accessibilityRole="checkbox" accessibilityState={{ checked: remember }}>
            <View style={[styles.box, remember && styles.boxOn]}>{remember ? <Text style={styles.tick}>✓</Text> : null}</View>
            <Text style={styles.rememberText}>Remember me</Text>
          </Pressable>

          {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
          <PrimaryButton label="Sign In" onPress={handleSignIn} busy={loading} />
        </View>
        {checking ? <ActivityIndicator color={colors.teal} style={{ marginTop: space.xl }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  page: { alignItems: "center", paddingHorizontal: space.xl },
  logo: { alignSelf: "center" },
  appName: { ...type.title, marginTop: space.xl },
  tagline: { color: colors.aqua, fontSize: 14, marginTop: space.xs, marginBottom: space.xl },
  card: { ...card, width: "100%", maxWidth: 440, padding: space.xl, borderRadius: radius.xl },
  cardTitle: { ...type.h2, fontSize: 21 },
  cardSub: { ...type.muted, marginTop: 4, marginBottom: space.lg },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHigh, borderRadius: radius.md, paddingHorizontal: space.md, marginBottom: space.lg, minHeight: 52 },
  inputIcon: { fontSize: 15, marginRight: space.sm, color: colors.textMuted },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text },
  eye: { color: colors.aqua, fontWeight: "700", fontSize: 14 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.lg, minHeight: 36, alignSelf: "flex-start" },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  tick: { color: colors.tealInk, fontWeight: "900", fontSize: 13 },
  rememberText: { color: colors.text, fontSize: 15 },
  error: { color: colors.danger, textAlign: "center", marginBottom: space.md },
});
